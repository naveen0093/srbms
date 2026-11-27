// Larven Enterprises BMS - Cloudflare Pages Advanced Worker
// Supabase Backend, GoTrue Phone Auth, User Management, RLS & Cloudflare Turnstile

const J = (o, s = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: Object.assign(
      {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(self), geolocation=(self)'
      },
      extraHeaders
    )
  });

// Maximum Content-Length and Request Body Size Limits
const SIZE_LIMITS = {
  DEFAULT_JSON: 1 * 1024 * 1024,      // 1 MB general JSON payload limit
  RPC_PAYLOAD: 1 * 1024 * 1024,       // 1 MB RPC payload limit
  USER_PAYLOAD: 512 * 1024,           // 512 KB user management payload limit
  AUTH_PAYLOAD: 128 * 1024,           // 128 KB auth/password payload limit
  ATTENDANCE: 250 * 1024,             // 250 KB attendance payload limit
  SLIP: 60 * 1024,                    // 60 KB slip payload limit
  APPLY: 3 * 1024 * 1024,             // 3 MB application payload limit
  DOC_FILE: 10 * 1024 * 1024,         // 10 MB per employee document file
  EVIDENCE_FILE: 50 * 1024 * 1024     // 50 MB per vehicle evidence file
};

const MAX = SIZE_LIMITS.APPLY;
const DUTY_TAGS = ['delivery', 'production', 'godown'];
const SYSTEM_ROLES = ['admin', 'owner', 'manager', 'employee'];

// Strict allowlist of the 13 delivery and operational RPCs
const ALLOWED_RPCS = new Set([
  'record_production',
  'transfer_stock',
  'create_order',
  'log_order_from_stop',
  'plan_trip',
  'confirm_loading',
  'arrive_at_stop',
  'deliver_stop',
  'skip_stop',
  'set_customer_location',
  'close_trip',
  'handover_cash',
  'production_plan'
]);

function checkContentLength(req, maxLimit = SIZE_LIMITS.DEFAULT_JSON) {
  const cl = req.headers.get('content-length');
  if (cl !== null) {
    const len = parseInt(cl, 10);
    if (isNaN(len) || len < 0 || len > maxLimit) {
      return false;
    }
  }
  return true;
}

async function parseJsonBody(req, maxLimit = SIZE_LIMITS.DEFAULT_JSON) {
  if (!checkContentLength(req, maxLimit)) {
    return { error: 'payload_too_large' };
  }
  const text = await req.text();
  if (text.length > maxLimit) {
    return { error: 'payload_too_large' };
  }
  try {
    return { data: text ? JSON.parse(text) : {} };
  } catch (e) {
    return { error: 'bad_json' };
  }
}

function same(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length || !b) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function istNow() {
  const d = new Date(Date.now() + 19800000);
  const x = d.toISOString();
  return { date: x.slice(0, 10), time: x.slice(11, 19) };
}

function hav(a, b, c, d) {
  const R = 6371000;
  const r = Math.PI / 180;
  const x = (c - a) * r;
  const y = (d - b) * r;
  const k = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(k));
}

function sbBase(env) {
  return String(env.SUPABASE_URL || '').replace(/\/+$/, '');
}

function serviceHeaders(env, extra = {}) {
  return Object.assign(
    {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
    },
    extra
  );
}

async function sbRest(env, path, opt = {}) {
  const headers = serviceHeaders(env, Object.assign({ 'content-type': 'application/json' }, opt.headers || {}));
  return fetch(sbBase(env) + '/rest/v1/' + path, Object.assign({}, opt, { headers }));
}

async function sbAdmin(env, path, opt = {}) {
  const headers = serviceHeaders(env, Object.assign({ 'content-type': 'application/json' }, opt.headers || {}));
  return fetch(sbBase(env) + '/auth/v1/admin/' + path, Object.assign({}, opt, { headers }));
}

function formatPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10 && /^[6-9]/.test(d)) return '+91' + d;
  if (d.length === 12 && d.startsWith('91') && /^[6-9]/.test(d.slice(2))) return '+' + d;
  return null;
}

function cleanDigits(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  return d;
}

function roleRank(role) {
  if (role === 'admin') return 4;
  if (role === 'owner') return 3;
  if (role === 'manager') return 2;
  if (role === 'employee') return 1;
  return 0;
}

function canCreateRole(callerRole, targetRole) {
  if (callerRole === 'admin') return true;
  if (callerRole === 'owner') return targetRole === 'manager' || targetRole === 'employee';
  if (callerRole === 'manager') return targetRole === 'employee';
  return false;
}

function canManageUser(callerRole, targetRole, action = 'manage') {
  if (callerRole === 'admin') return true;
  if (callerRole === 'owner') {
    // Decisions Block: Owner can deactivate admin accounts
    if (targetRole === 'admin' && action === 'deactivate') return true;
    return targetRole === 'manager' || targetRole === 'employee';
  }
  if (callerRole === 'manager') {
    return targetRole === 'employee';
  }
  return false;
}

async function countActiveOwners(env) {
  const r = await sbRest(env, 'profiles?role=eq.owner&active=eq.true&select=id');
  if (!r.ok) return 1;
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows.length : 1;
}

async function verifyAuth(req, env) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  const r = await fetch(sbBase(env) + '/auth/v1/user', {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: 'Bearer ' + token
    }
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u || !u.id) return null;

  const pr = await sbRest(
    env,
    'profiles?id=eq.' + encodeURIComponent(u.id) + '&select=id,full_name,role,phone,employee_id,active'
  );
  if (!pr.ok) return null;
  const rows = await pr.json().catch(() => []);
  const profile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!profile || !profile.active) return null;

  return { user: u, profile, token };
}

async function logAudit(env, caller, action, tableName, rowId, oldVal, newVal) {
  try {
    await sbRest(env, 'audit_log', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: caller.user.id,
        role: caller.profile.role,
        table_name: tableName,
        row_id: String(rowId),
        action: action,
        old: oldVal ? oldVal : null,
        new: newVal ? newVal : null
      })
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

async function verifyTurnstile(token, secret, ip) {
  if (!secret) return false; // Fail closed when no secret is set
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) return false;
    const outcome = await res.json().catch(() => ({}));
    return !!outcome.success;
  } catch (e) {
    return false;
  }
}

function generateTempPassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const chars = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length]
  ];
  for (let i = 4; i < length; i++) {
    chars.push(all[bytes[i] % all.length]);
  }
  for (let i = length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }
  return chars.join('');
}

function buildCspHeader(env) {
  let sbOrigin = '';
  if (env && env.SUPABASE_URL) {
    try {
      sbOrigin = new URL(env.SUPABASE_URL).origin;
    } catch (e) {}
  }
  const sbHosts = sbOrigin ? `${sbOrigin} https://*.supabase.co` : 'https://*.supabase.co';
  const sbWss = sbOrigin ? sbOrigin.replace(/^http/i, 'ws') : 'wss://*.supabase.co';

  return [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${sbHosts}`,
    `connect-src 'self' https://challenges.cloudflare.com ${sbHosts} ${sbWss}`,
    `frame-src 'self' blob: https://challenges.cloudflare.com ${sbHosts}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ].join('; ');
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);

    // Serve Static Assets with Security Headers
    if (!u.pathname.startsWith('/api/')) {
      const res = await env.ASSETS.fetch(req);
      const ct = res.headers.get('content-type') || '';
      const headers = new Headers(res.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      headers.set('Permissions-Policy', 'camera=(self), geolocation=(self)');
      if (ct.includes('text/html') || u.pathname === '/' || u.pathname.endsWith('.html') || !u.pathname.includes('.')) {
        headers.set('Content-Security-Policy', buildCspHeader(env));
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers
        });
      }
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers
      });
    }

    // Global Content-Length check for mutation requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!checkContentLength(req, SIZE_LIMITS.EVIDENCE_FILE)) {
        return J({ error: 'payload_too_large', message: 'Request exceeds maximum allowable size' }, 413);
      }
    }

    const p = u.pathname;
    const m = req.method;

    try {
      // -------------------------------------------------------------
      // 1. PUBLIC CONFIGURATION
      // -------------------------------------------------------------
      if (p === '/api/config' && m === 'GET') {
        return J({
          url: sbBase(env),
          anonKey: env.SUPABASE_ANON_KEY || '',
          turnstileSiteKey: env.TURNSTILE_SITE_KEY || ''
        });
      }

      // -------------------------------------------------------------
      // 2. PHONE + PASSWORD AUTHENTICATION WITH TURNSTILE
      // -------------------------------------------------------------
      if (p === '/api/auth/login' && m === 'POST') {
        const bodyRes = await parseJsonBody(req, SIZE_LIMITS.AUTH_PAYLOAD);
        if (bodyRes.error === 'payload_too_large') {
          return J({ error: 'payload_too_large', message: 'Request payload exceeds size limit' }, 413);
        }
        if (bodyRes.error === 'bad_json') {
          return J({ error: 'Invalid phone number or password' }, 401);
        }
        const body = bodyRes.data || null;
        if (!body || !body.phone || !body.password) {
          return J({ error: 'Invalid phone number or password' }, 401);
        }

        // 1. Verify Turnstile Token
        const turnstileToken = body.turnstile_token || body['cf-turnstile-response'] || '';
        const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '';
        const isHuman = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
        if (!isHuman) {
          // Generic security error
          return J({ error: 'Security verification failed. Please complete the security check.' }, 400);
        }

        // 2. Normalize Indian Phone Number to E.164
        const formattedPhone = formatPhone(body.phone);
        if (!formattedPhone) {
          // Generic error: never reveal invalid phone vs wrong password
          return J({ error: 'Invalid phone number or password' }, 401);
        }

        // 3. Supabase Auth Password Grant
        const tokenRes = await fetch(sbBase(env) + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            phone: formattedPhone,
            password: String(body.password)
          })
        });

        if (!tokenRes.ok) {
          // Generic error for bad credentials
          return J({ error: 'Invalid phone number or password' }, 401);
        }

        const tokenData = await tokenRes.json().catch(() => null);
        if (!tokenData || !tokenData.access_token || !tokenData.user) {
          return J({ error: 'Invalid phone number or password' }, 401);
        }

        // 4. Fetch User Profile & Active Status
        const profRes = await sbRest(
          env,
          'profiles?id=eq.' + encodeURIComponent(tokenData.user.id) + '&select=id,full_name,role,phone,employee_id,active'
        );
        const profRows = profRes.ok ? await profRes.json().catch(() => []) : [];
        const profile = Array.isArray(profRows) && profRows.length > 0 ? profRows[0] : null;

        if (!profile || !profile.active) {
          return J({ error: 'Invalid phone number or password' }, 401);
        }

        // 5. Audit Log Login Event
        await logAudit(
          env,
          { user: tokenData.user, profile },
          'INSERT',
          'profiles',
          profile.id,
          null,
          { event: 'login', at: new Date().toISOString() }
        );

        const mustChange = !!(tokenData.user.user_metadata && tokenData.user.user_metadata.must_change_password);

        return J({
          ok: true,
          session: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in
          },
          user: {
            id: tokenData.user.id,
            phone: profile.phone || tokenData.user.phone,
            full_name: profile.full_name,
            role: profile.role,
            employee_id: profile.employee_id
          },
          must_change_password: mustChange
        });
      }

      // -------------------------------------------------------------
      // 3. FORCED PASSWORD CHANGE ENDPOINT
      // -------------------------------------------------------------
      if (p === '/api/auth/change-password' && m === 'POST') {
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'Unauthorized' }, 401);

        const bodyRes = await parseJsonBody(req, SIZE_LIMITS.AUTH_PAYLOAD);
        if (bodyRes.error === 'payload_too_large') {
          return J({ error: 'payload_too_large', message: 'Request payload exceeds size limit' }, 413);
        }
        if (bodyRes.error === 'bad_json') {
          return J({ error: 'Invalid JSON payload' }, 400);
        }
        const body = bodyRes.data || {};
        const newPassword = String((body && body.new_password) || '').trim();
        if (newPassword.length < 8) {
          return J({ error: 'Password must be at least 8 characters' }, 400);
        }

        // Update password and clear must_change_password flag
        const updateRes = await sbAdmin(env, 'users/' + encodeURIComponent(caller.user.id), {
          method: 'PUT',
          body: JSON.stringify({
            password: newPassword,
            user_metadata: Object.assign({}, caller.user.user_metadata || {}, {
              must_change_password: false
            })
          })
        });

        if (!updateRes.ok) {
          return J({ error: 'Failed to update password' }, 500);
        }

        await logAudit(
          env,
          caller,
          'UPDATE',
          'profiles',
          caller.user.id,
          { must_change_password: true },
          { must_change_password: false }
        );

        return J({ ok: true, message: 'Password changed successfully' });
      }

      // -------------------------------------------------------------
      // 4. USER MANAGEMENT: LIST USERS ACCORDING TO RANK
      // Managers see employees; Owner sees managers, employees & admins; Admin sees all
      // -------------------------------------------------------------
      if (p === '/api/users' && m === 'GET') {
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'Unauthorized' }, 401);

        const callerRole = caller.profile.role;
        if (callerRole === 'employee') {
          return J({ error: 'Forbidden' }, 403);
        }

        let filter = '';
        if (callerRole === 'manager') {
          filter = 'role=eq.employee';
        } else if (callerRole === 'owner') {
          // Owner sees managers and employees, and admins (for 'who has admin access')
          filter = 'role=in.(manager,employee,admin)';
        }
        // Admin sees all without filter

        const profRes = await sbRest(
          env,
          'profiles?' + (filter ? filter + '&' : '') + 'select=id,full_name,role,phone,employee_id,created_by,active,created_at&order=created_at.asc'
        );
        if (!profRes.ok) return J({ error: 'Failed to fetch profiles' }, 500);
        const profiles = await profRes.json().catch(() => []);

        // Fetch employee duty tags from employees table
        const empRes = await sbRest(env, 'employees?select=id,duties,salary,active');
        const empMap = new Map();
        if (empRes.ok) {
          const empRows = await empRes.json().catch(() => []);
          for (const emp of empRows) {
            if (emp && emp.id) empMap.set(emp.id, emp);
          }
        }

        const users = (Array.isArray(profiles) ? profiles : []).map((p) => {
          const emp = p.employee_id ? empMap.get(p.employee_id) : null;
          return {
            id: p.id,
            full_name: p.full_name,
            role: p.role,
            phone: p.phone,
            employee_id: p.employee_id,
            duties: emp ? emp.duties || [] : [],
            salary: emp ? emp.salary : null,
            created_by: p.created_by,
            active: p.active,
            created_at: p.created_at
          };
        });

        return J({ ok: true, users });
      }

      // -------------------------------------------------------------
      // 5. USER MANAGEMENT: CREATE USER (Supabase Admin API)
      // Enforces creation rank rules, phone_confirm true, must_change_password true
      // -------------------------------------------------------------
      if (p === '/api/users' && m === 'POST') {
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'Unauthorized' }, 401);

        const bodyRes = await parseJsonBody(req, SIZE_LIMITS.USER_PAYLOAD);
        if (bodyRes.error === 'payload_too_large') {
          return J({ error: 'payload_too_large', message: 'Request payload exceeds size limit' }, 413);
        }
        if (bodyRes.error === 'bad_json') {
          return J({ error: 'Invalid request body' }, 400);
        }
        const body = bodyRes.data || null;
        if (!body) return J({ error: 'Invalid request body' }, 400);

        const fullName = String(body.full_name || '').trim();
        const role = String(body.role || '').trim().toLowerCase();
        const rawPhone = String(body.phone || '').trim();
        const formattedPhone = formatPhone(rawPhone);
        const cleanPhone = cleanDigits(rawPhone);
        const duties = Array.isArray(body.duties)
          ? body.duties.filter((d) => DUTY_TAGS.includes(d))
          : [];

        if (!fullName || fullName.length < 2) {
          return J({ error: 'Full name must be at least 2 characters' }, 400);
        }
        if (!formattedPhone) {
          return J({ error: 'Enter a valid 10-digit mobile number' }, 400);
        }
        if (!SYSTEM_ROLES.includes(role)) {
          return J({ error: 'Invalid role specified' }, 400);
        }

        // Enforce Rank Rules from Decisions Block
        if (!canCreateRole(caller.profile.role, role)) {
          return J(
            { error: 'Permission denied: Your role (' + caller.profile.role + ') cannot create accounts with role (' + role + ')' },
            403
          );
        }

        // Generate temporary password
        const tempPassword = body.password && String(body.password).length >= 8
          ? String(body.password)
          : generateTempPassword(16);

        // 1. Create User in Supabase Auth Admin API
        const authRes = await sbAdmin(env, 'users', {
          method: 'POST',
          body: JSON.stringify({
            phone: formattedPhone,
            password: tempPassword,
            phone_confirm: true,
            user_metadata: {
              full_name: fullName,
              must_change_password: true,
              role: role
            }
          })
        });

        if (!authRes.ok) {
          const errObj = await authRes.json().catch(() => ({}));
          const errMsg = errObj.msg || errObj.message || 'Failed to create auth user';
          return J({ error: errMsg }, authRes.status === 422 ? 409 : 400);
        }

        const newAuthUser = await authRes.json().catch(() => null);
        if (!newAuthUser || !newAuthUser.id) {
          return J({ error: 'Failed to create auth user' }, 500);
        }

        const newUserId = newAuthUser.id;
        let employeeId = null;

        // 2. If Employee or Manager, create employee record in public.employees
        if (role === 'employee' || role === 'manager') {
          const empPrefix = role === 'manager' ? 'MGR-' : 'EMP-';
          employeeId = empPrefix + Date.now().toString().slice(-6);

          const empPayload = {
            id: employeeId,
            name: fullName,
            role: role,
            phone: cleanPhone,
            salary: Number(body.salary) || 0,
            address: String(body.address || '').trim(),
            duties: role === 'employee' ? duties : [],
            active: true
          };

          const empIns = await sbRest(env, 'employees', {
            method: 'POST',
            headers: { prefer: 'return=representation' },
            body: JSON.stringify(empPayload)
          });

          if (!empIns.ok) {
            // Rollback auth user
            await sbAdmin(env, 'users/' + encodeURIComponent(newUserId), { method: 'DELETE' }).catch(() => {});
            return J({ error: 'Failed to create employee record' }, 500);
          }
        }

        // 3. Create profile in public.profiles (service role)
        const profilePayload = {
          id: newUserId,
          full_name: fullName,
          role: role,
          phone: cleanPhone,
          employee_id: employeeId,
          created_by: caller.user.id,
          active: true
        };

        const profIns = await sbRest(env, 'profiles', {
          method: 'POST',
          headers: { prefer: 'return=representation' },
          body: JSON.stringify(profilePayload)
        });

        if (!profIns.ok) {
          // Rollback
          if (employeeId) {
            await sbRest(env, 'employees?id=eq.' + encodeURIComponent(employeeId), { method: 'DELETE' }).catch(() => {});
          }
          await sbAdmin(env, 'users/' + encodeURIComponent(newUserId), { method: 'DELETE' }).catch(() => {});
          return J({ error: 'Failed to create profile' }, 500);
        }

        // 4. Log Action to audit_log with real caller
        await logAudit(
          env,
          caller,
          'INSERT',
          'profiles',
          newUserId,
          null,
          { phone: cleanPhone, role: role, full_name: fullName, employee_id: employeeId }
        );

        return J(
          {
            ok: true,
            user: {
              id: newUserId,
              full_name: fullName,
              role: role,
              phone: cleanPhone,
              employee_id: employeeId,
              duties: duties,
              active: true
            },
            temporary_password: tempPassword
          },
          201
        );
      }

      // -------------------------------------------------------------
      // 6. USER MANAGEMENT: CHANGE DUTY TAGS
      // -------------------------------------------------------------
      const dutyTagsMatch = /^\/api\/users\/([0-9a-fA-F-]{36})\/duty-tags$/.exec(p);
      if (dutyTagsMatch && m === 'PATCH') {
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'Unauthorized' }, 401);

        const targetId = dutyTagsMatch[1];
        const bodyRes = await parseJsonBody(req, SIZE_LIMITS.USER_PAYLOAD);
        if (bodyRes.error === 'payload_too_large') {
          return J({ error: 'payload_too_large', message: 'Request payload exceeds size limit' }, 413);
        }
        if (bodyRes.error === 'bad_json') {
          return J({ error: 'Invalid duties payload' }, 400);
        }
        const body = bodyRes.data || null;
        if (!body || !Array.isArray(body.duties)) {
          return J({ error: 'Invalid duties payload' }, 400);
        }

        const cleanDuties = body.duties.filter((d) => DUTY_TAGS.includes(d));

        // Fetch target profile
        const profRes = await sbRest(
          env,
          'profiles?id=eq.' + encodeURIComponent(targetId) + '&select=id,role,employee_id'
        );
        if (!profRes.ok) return J({ error: 'User not found' }, 404);
        const rows = await profRes.json().catch(() => []);
        const target = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!target) return J({ error: 'User not found' }, 404);

        // Check caller rank permission
        if (!canManageUser(caller.profile.role, target.role, 'duty_tags')) {
          return J({ error: 'Permission denied: Cannot modify account of equal or higher rank' }, 403);
        }

        if (!target.employee_id) {
          return J({ error: 'Target user has no linked employee record' }, 400);
        }

        // Fetch old duties for audit
        const empRes = await sbRest(env, 'employees?id=eq.' + encodeURIComponent(target.employee_id) + '&select=duties');
        const empRows = empRes.ok ? await empRes.json().catch(() => []) : [];
        const oldDuties = empRows.length > 0 ? empRows[0].duties : [];

        // Update duties in employees table
        const updRes = await sbRest(env, 'employees?id=eq.' + encodeURIComponent(target.employee_id), {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({ duties: cleanDuties })
        });
        if (!updRes.ok) return J({ error: 'Failed to update duty tags' }, 500);

        // Audit Log
        await logAudit(
          env,
          caller,
          'UPDATE',
          'employees',
          target.employee_id,
          { duties: oldDuties },
          { duties: cleanDuties }
        );

        return J({ ok: true, employee_id: target.employee_id, duties: cleanDuties });
      }

      // -------------------------------------------------------------
      // 7. USER MANAGEMENT: DEACTIVATE USER
      // Owner can deactivate admin accounts; Last active owner protected
      // -------------------------------------------------------------
      const deactivateMatch = /^\/api\/users\/([0-9a-fA-F-]{36})\/deactivate$/.exec(p);
      if (deactivateMatch && m === 'POST') {
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'Unauthorized' }, 401);

        const targetId = deactivateMatch[1];
        const profRes = await sbRest(
          env,
          'profiles?id=eq.' + encodeURIComponent(targetId) + '&select=id,role,employee_id,active'
        );
        if (!profRes.ok) return J({ error: 'User not found' }, 404);
        const rows = await profRes.json().catch(() => []);
        const target = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!target) return J({ error: 'User not found' }, 404);

        if (!target.active) {
          return J({ ok: true, message: 'User is already inactive' });
        }

        // Rule: The last active owner cannot be removed or deactivated
        if (target.role === 'owner') {
          const activeOwners = await countActiveOwners(env);
          if (activeOwners <= 1) {
            return J(
              { error: 'cannot_remove_last_active_owner', message: 'The last active owner cannot be removed or deactivated.' },
              400
            );
          }
        }

        // Enforce rank rules (Owner can deactivate admin accounts per Decisions Block)
        if (!canManageUser(caller.profile.role, target.role, 'deactivate')) {
          return J({ error: 'Permission denied: Cannot deactivate account of equal or higher rank' }, 403);
        }

        // 1. Deactivate in profiles
        const updProf = await sbRest(env, 'profiles?id=eq.' + encodeURIComponent(targetId), {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({ active: false })
        });
        if (!updProf.ok) return J({ error: 'Failed to deactivate profile' }, 500);

        // 2. Deactivate linked employee if present
        if (target.employee_id) {
          await sbRest(env, 'employees?id=eq.' + encodeURIComponent(target.employee_id), {
            method: 'PATCH',
            headers: { prefer: 'return=minimal' },
            body: JSON.stringify({ active: false })
          });
        }

        // 3. Ban in Supabase Auth Admin API
        await sbAdmin(env, 'users/' + encodeURIComponent(targetId), {
          method: 'PUT',
          body: JSON.stringify({ ban_duration: '876000h' })
        }).catch(() => {});

        // 4. Log to audit_log with real caller
        await logAudit(
          env,
          caller,
          'UPDATE',
          'profiles',
          targetId,
          { active: true },
          { active: false, action: 'deactivate' }
        );

        return J({ ok: true, user_id: targetId, active: false });
      }

      // -------------------------------------------------------------
      // 8. USER MANAGEMENT: RESET PASSWORD
      // -------------------------------------------------------------
      const pwResetMatch = /^\/api\/users\/([0-9a-fA-F-]{36})\/reset-password$/.exec(p);
      if (pwResetMatch && m === 'POST') {
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'Unauthorized' }, 401);

        const targetId = pwResetMatch[1];
        const profRes = await sbRest(
          env,
          'profiles?id=eq.' + encodeURIComponent(targetId) + '&select=id,role,active'
        );
        if (!profRes.ok) return J({ error: 'User not found' }, 404);
        const rows = await profRes.json().catch(() => []);
        const target = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!target) return J({ error: 'User not found' }, 404);

        if (!canManageUser(caller.profile.role, target.role, 'reset_password')) {
          return J({ error: 'Permission denied: Cannot reset password for account of equal or higher rank' }, 403);
        }

        const tempPassword = generateTempPassword(16);

        // Update password and enforce must_change_password = true
        const adminRes = await sbAdmin(env, 'users/' + encodeURIComponent(targetId), {
          method: 'PUT',
          body: JSON.stringify({
            password: tempPassword,
            user_metadata: {
              must_change_password: true
            }
          })
        });

        if (!adminRes.ok) {
          return J({ error: 'Failed to reset password' }, 500);
        }

        await logAudit(
          env,
          caller,
          'UPDATE',
          'profiles',
          targetId,
          null,
          { action: 'reset_password', must_change_password: true }
        );

        return J({ ok: true, user_id: targetId, temporary_password: tempPassword });
      }

      // -------------------------------------------------------------
      // 8B. SECURITY DEFINER RPC EXECUTION ENDPOINT (/api/rpc/:fn)
      // Allowlist of 13 delivery RPCs, DB-level idempotency_keys & trip status, 502 on 5xx/exceptions
      // -------------------------------------------------------------
      const rpcMatch = /^\/api\/rpc\/([a-zA-Z0-9_]+)$/.exec(p);
      if (rpcMatch && m === 'POST') {
        const fn = rpcMatch[1];

        // 1. Strict allowlist check for the 13 delivery/operational RPCs
        if (!ALLOWED_RPCS.has(fn)) {
          return J({ error: 'not_found', message: 'RPC not permitted or not found' }, 404);
        }

        // 2. Caller authentication
        const caller = await verifyAuth(req, env);
        if (!caller) return J({ error: 'unauthorized', message: 'Authentication required' }, 401);

        // 3. Payload size check
        const bodyRes = await parseJsonBody(req, SIZE_LIMITS.RPC_PAYLOAD);
        if (bodyRes.error === 'payload_too_large') {
          return J({ error: 'payload_too_large', message: 'RPC payload exceeds maximum allowed size' }, 413);
        }
        if (bodyRes.error === 'bad_json') {
          return J({ error: 'bad_request', message: 'Invalid JSON payload' }, 400);
        }
        const body = bodyRes.data || {};

        // 4. Ensure Supabase credentials are configured
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return J({ error: 'bad_gateway', message: 'Database backend not configured' }, 502);
        }

        // 5. Forward to Supabase REST RPC endpoint
        // Relies on public.idempotency_keys table and DB-level trip status checks
        let sbRes;
        try {
          sbRes = await fetch(sbBase(env) + '/rest/v1/rpc/' + encodeURIComponent(fn), {
            method: 'POST',
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              authorization: req.headers.get('authorization') || ('Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY),
              'content-type': 'application/json',
              prefer: 'return=representation'
            },
            body: JSON.stringify(body)
          });
        } catch (fetchErr) {
          console.error(`Fetch exception communicating with Supabase RPC (${fn}):`, fetchErr);
          // On exception return 502 so the outbox retries
          return J(
            {
              ok: false,
              error: 'bad_gateway',
              message: 'Database RPC connection failed: ' + (fetchErr.message || String(fetchErr))
            },
            502
          );
        }

        // 6. Handle Supabase 5xx errors -> return 502 so client outbox retries
        if (sbRes.status >= 500) {
          const errBody = await sbRes.json().catch(() => ({}));
          return J(
            {
              ok: false,
              error: 'bad_gateway',
              message: errBody.message || 'Database RPC internal error',
              details: errBody
            },
            502
          );
        }

        // 7. Handle Supabase 4xx business errors (e.g. 400, 401, 403, 409 conflict/trip_cancelled)
        if (sbRes.status >= 400 && sbRes.status < 500) {
          const errBody = await sbRes.json().catch(() => ({}));
          return J(Object.assign({ ok: false }, errBody), sbRes.status);
        }

        // 8. Handle Success (2xx)
        const sbData = await sbRes.json().catch(() => ({}));
        if (typeof sbData === 'object' && sbData !== null && !Array.isArray(sbData)) {
          return J(Object.assign({ ok: true }, sbData), 200);
        }
        return J({ ok: true, data: sbData }, 200);
      }

      // -------------------------------------------------------------
      // 9. LEGACY KV / ATTENDANCE / INVITATION SUPPORT
      // -------------------------------------------------------------
      if (env.KV && env.ADMIN_KEY) {
        const admin = same(req.headers.get('x-admin-key'), env.ADMIN_KEY);

        if (p === '/api/ping' && m === 'GET') {
          return admin ? J({ ok: true }) : J({ error: 'unauthorized' }, 401);
        }

        if (p === '/api/invite' && m === 'POST') {
          if (!admin) return J({ error: 'unauthorized' }, 401);
          if (!checkContentLength(req, SIZE_LIMITS.DEFAULT_JSON)) return J({ error: 'too_big' }, 413);
          const b = await req.json().catch(() => null);
          if (!b || !/^[a-z0-9]{6,16}$/.test(String(b.t || ''))) return J({ error: 'bad' }, 400);
          await env.KV.put('inv:' + b.t, '1', { expirationTtl: 60 * 60 * 24 * 30 });
          return J({ ok: true });
        }

        if (p === '/api/apply' && m === 'POST') {
          if (!checkContentLength(req, SIZE_LIMITS.APPLY)) return J({ error: 'too_big' }, 413);
          const tx = await req.text();
          if (tx.length > SIZE_LIMITS.APPLY) return J({ error: 'too_big' }, 413);
          let a;
          try { a = JSON.parse(tx); } catch (e) { return J({ error: 'bad' }, 400); }
          if (!a || a.srjoin !== 1 || !/^[A-Za-z0-9_-]{4,40}$/.test(String(a.id || '')) || !/^[a-z0-9]{6,16}$/.test(String(a.t || ''))) return J({ error: 'bad' }, 400);
          if (await env.KV.get('app:' + a.id)) return J({ ok: true });
          if (!(await env.KV.get('inv:' + a.t))) return J({ error: 'link_invalid' }, 403);
          await env.KV.put('app:' + a.id, tx, { expirationTtl: 60 * 60 * 24 * 60 });
          await env.KV.delete('inv:' + a.t);
          return J({ ok: true });
        }

        if (p === '/api/me' && m === 'GET') {
          const t = u.searchParams.get('tok') || '';
          if (!/^[a-z0-9]{16,40}$/.test(t)) return J({ error: 'bad' }, 400);
          const e = await env.KV.get('emp:' + t);
          if (!e) return J({ error: 'unknown_emp' }, 404);
          const emp = JSON.parse(e);
          const cs = await env.KV.get('cfg:sites');
          const cfg = cs ? JSON.parse(cs) : { sites: [] };
          const rec = await env.KV.get('a:' + istNow().date + ':' + emp.id);
          return J({ name: emp.name, sites: (cfg.sites || []).map((x) => x.name), today: rec ? JSON.parse(rec) : null, date: istNow().date });
        }

        if (p === '/api/att' && m === 'POST') {
          if (!checkContentLength(req, SIZE_LIMITS.ATTENDANCE)) return J({ error: 'too_big' }, 413);
          const tx = await req.text();
          if (tx.length > SIZE_LIMITS.ATTENDANCE) return J({ error: 'too_big' }, 413);
          let b;
          try { b = JSON.parse(tx); } catch (e) { return J({ error: 'bad' }, 400); }
          if (!b || !/^[a-z0-9]{16,40}$/.test(String(b.tok || '')) || (b.kind !== 'in' && b.kind !== 'out')) return J({ error: 'bad' }, 400);
          const e = await env.KV.get('emp:' + b.tok);
          if (!e) return J({ error: 'unknown_emp' }, 404);
          const emp = JSON.parse(e);
          const q = String(b.code || '').split('|');
          if (q.length !== 3 || q[0] !== 'SRATT') return J({ error: 'bad_code' }, 400);
          const cs = await env.KV.get('cfg:sites');
          const cfg = cs ? JSON.parse(cs) : { sites: [] };
          const site = (cfg.sites || []).find((x) => x.id === q[1]);
          if (!site || !same(q[2], site.code)) return J({ error: 'bad_code' }, 400);
          let dist = null;
          if (site.lat != null && site.lng != null) {
            const la = Number(b.lat);
            const ln = Number(b.lng);
            if (!isFinite(la) || !isFinite(ln) || b.lat == null) return J({ error: 'location_required' }, 400);
            dist = Math.round(hav(site.lat, site.lng, la, ln));
            const acc = Math.min(Math.max(Number(b.acc) || 0, 0), 60);
            if (dist > (Number(site.r) || 100) + acc) return J({ error: 'too_far', dist, site: site.name, r: Number(site.r) || 100 }, 403);
          }
          const ph = String(b.photo || '');
          if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(ph) || ph.length > 200000) return J({ error: 'bad_photo' }, 400);
          const n = istNow();
          const key = 'a:' + n.date + ':' + emp.id;
          const old = await env.KV.get(key);
          const rec = old ? JSON.parse(old) : { emp: emp.id, name: emp.name, date: n.date };
          if (b.kind === 'in' && rec.in) return J({ ok: true, dup: true, kind: 'in', time: rec.in.t, site: rec.in.siteName });
          const pk = 'ap:' + n.date + ':' + emp.id + ':' + b.kind + ':' + n.time.replace(/:/g, '');
          await env.KV.put(pk, ph, { expirationTtl: 60 * 60 * 24 * 120 });
          rec[b.kind] = { t: n.time, site: site.id, siteName: site.name, dist, ph: pk };
          await env.KV.put(key, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 400 });
          return J({ ok: true, kind: b.kind, time: n.time, site: site.name, dist });
        }

        if (p === '/api/slips' && m === 'GET') {
          const t = u.searchParams.get('tok') || '';
          if (!/^[a-z0-9]{16,40}$/.test(t)) return J({ error: 'bad' }, 400);
          const v = await env.KV.get('slips:' + t);
          return J({ items: v ? JSON.parse(v) : [] });
        }

        if (p === '/api/slip' && m === 'POST') {
          if (!admin) return J({ error: 'unauthorized' }, 401);
          if (!checkContentLength(req, SIZE_LIMITS.SLIP)) return J({ error: 'too_big' }, 413);
          const tx = await req.text();
          if (tx.length > SIZE_LIMITS.SLIP) return J({ error: 'too_big' }, 413);
          const b = JSON.parse(tx);
          if (!/^[a-z0-9]{16,40}$/.test(String(b.tok || '')) || !b.item || !/^[A-Za-z0-9_-]{4,40}$/.test(String(b.item.id || ''))) return J({ error: 'bad' }, 400);
          const old = await env.KV.get('slips:' + b.tok);
          let a = old ? JSON.parse(old) : [];
          a = a.filter((x) => x.id !== b.item.id);
          a.push(b.item);
          a = a.slice(-48);
          await env.KV.put('slips:' + b.tok, JSON.stringify(a));
          return J({ ok: true });
        }
      }
    } catch (e) {
      console.error('Worker error:', e);
      return J({ error: 'server_error' }, 500);
    }

    return J({ error: 'not_found' }, 404);
  }
};

// SR Industries BMS - Cloudflare Pages Worker (Supabase backend)
// Environment variables required in Cloudflare Pages:
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY (secret; never exposed to frontend)

const J = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const MAX_APPLY_BYTES = 6 * 1024 * 1024;
const MAX_SLIP_BYTES = 100 * 1024;
const ALLOWED_ROLES = ['owner', 'manager', 'accountant', 'billing_staff', 'driver'];
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

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

async function requireRole(req, env, roles) {
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
    'profiles?user_id=eq.' + encodeURIComponent(u.id) + '&select=user_id,full_name,role,employee_id,active'
  );
  if (!pr.ok) return null;
  const rows = await pr.json().catch(() => []);
  const profile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!profile || !profile.active) return null;

  if (Array.isArray(roles) && roles.length > 0) {
    if (!roles.includes(profile.role)) return null;
  }

  return { user: u, profile };
}

async function verifyOwner(req, env) {
  const caller = await requireRole(req, env, ['owner']);
  return caller ? caller.user : null;
}

async function countActiveOwners(env) {
  const r = await sbRest(env, 'profiles?role=eq.owner&active=eq.true&select=user_id');
  if (!r.ok) throw new Error('failed_to_count_owners');
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows.length : 0;
}

function isValidUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ''));
}

function generateTempPassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+';
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
  const shuffleBytes = new Uint8Array(length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }
  return chars.join('');
}

function parseDataUrl(dataUrl, allowPdf) {
  const m = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/i.exec(String(dataUrl || ''));
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (mime === 'application/pdf' && !allowPdf) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext =
    mime === 'application/pdf'
      ? 'pdf'
      : mime === 'image/png'
      ? 'png'
      : mime === 'image/webp'
      ? 'webp'
      : 'jpg';
  return { mime, bytes, ext, docType: mime === 'application/pdf' ? 'pdf' : 'image' };
}

async function uploadStorage(env, bucket, path, parsed) {
  const r = await fetch(sbBase(env) + '/storage/v1/object/' + bucket + '/' + path, {
    method: 'POST',
    headers: serviceHeaders(env, {
      'content-type': parsed.mime,
      'x-upsert': 'true'
    }),
    body: parsed.bytes
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error('storage_upload_failed:' + r.status + ':' + txt);
  }
  return path;
}

async function deleteStorage(env, bucket, paths) {
  if (!paths || !paths.length) return { ok: true, deleted: 0 };
  const cleanPaths = Array.from(new Set(paths.filter((p) => typeof p === 'string' && p.trim().length > 0)));
  if (!cleanPaths.length) return { ok: true, deleted: 0 };
  try {
    const r = await fetch(sbBase(env) + '/storage/v1/object/' + bucket, {
      method: 'DELETE',
      headers: serviceHeaders(env, { 'content-type': 'application/json' }),
      body: JSON.stringify({ prefixes: cleanPaths })
    });
    if (r.ok) return { ok: true, deleted: cleanPaths.length };
  } catch (e) {}
  let deleted = 0;
  for (const p of cleanPaths) {
    try {
      const r = await fetch(sbBase(env) + '/storage/v1/object/' + bucket + '/' + encodeURI(p), {
        method: 'DELETE',
        headers: serviceHeaders(env)
      });
      if (r.ok) deleted++;
    } catch (e) {}
  }
  return { ok: true, deleted };
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
    "script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.sheetjs.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${sbHosts}`,
    `connect-src 'self' ${sbHosts} ${sbWss}`,
    `frame-src 'self' blob: ${sbHosts}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ].join('; ');
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/api/')) {
      const res = await env.ASSETS.fetch(req);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html') || u.pathname === '/' || u.pathname.endsWith('.html') || !u.pathname.includes('.')) {
        const headers = new Headers(res.headers);
        headers.set('Content-Security-Policy', buildCspHeader(env));
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'DENY');
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers
        });
      }
      return res;
    }

    const p = u.pathname;
    const m = req.method;

    try {
      // Public config endpoint for frontend @supabase/supabase-js initialization
      if (p === '/api/config' && m === 'GET') {
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
          return J({ error: 'not_configured' }, 503);
        }
        return J({ url: sbBase(env), anonKey: env.SUPABASE_ANON_KEY });
      }

      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return J({ error: 'not_configured' }, 503);
      }

      // Optional auth check
      if (p === '/api/ping' && m === 'GET') {
        const user = await verifyOwner(req, env);
        return user ? J({ ok: true }) : J({ error: 'unauthorized' }, 401);
      }

      // Owner-authenticated: create employee invite token
      if (p === '/api/invite' && m === 'POST') {
        const user = await verifyOwner(req, env);
        if (!user) return J({ error: 'unauthorized' }, 401);
        const b = await req.json().catch(() => null);
        const tok = String((b && b.t) || '');
        if (!/^[a-z0-9]{6,16}$/.test(tok)) return J({ error: 'bad' }, 400);

        const createdDate = /^\d{4}-\d{2}-\d{2}$/.test(String((b && b.date) || ''))
          ? String(b.date)
          : new Date().toISOString().slice(0, 10);
        const expiresAt =
          b && b.expires_at
            ? String(b.expires_at)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const r = await sbRest(env, 'employee_invites', {
          method: 'POST',
          headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            token: tok,
            status: 'open',
            created_date: createdDate,
            expires_at: expiresAt
          })
        });
        if (!r.ok) return J({ error: 'db_error' }, 500);
        return J({ ok: true });
      }

      // Public: submit #join= employee onboarding application
      if (p === '/api/apply' && m === 'POST') {
        const tx = await req.text();
        if (tx.length > MAX_APPLY_BYTES) return J({ error: 'too_big' }, 413);
        let a;
        try {
          a = JSON.parse(tx);
        } catch (e) {
          return J({ error: 'bad' }, 400);
        }

        const id = String((a && a.id) || '');
        const tok = String((a && a.t) || '');
        const name = String((a && a.name) || '').trim();
        const mobile = String((a && a.mobile) || '').replace(/\D/g, '').slice(-10);
        const address = String((a && a.address) || '').trim();
        const aadhaar = String((a && a.aadhaar) || '').replace(/\D/g, '');
        const pan = String((a && a.pan) || '').trim().toUpperCase();
        const licenseNo = String((a && a.licenseNo) || '').trim().toUpperCase().replace(/[\s/-]/g, '');

        if (
          !a ||
          a.srjoin !== 1 ||
          !/^[A-Za-z0-9_-]{4,40}$/.test(id) ||
          !/^[a-z0-9]{6,16}$/.test(tok) ||
          name.length < 2 ||
          name.length > 80 ||
          !/^[6-9]\d{9}$/.test(mobile) ||
          address.length < 3 ||
          address.length > 300 ||
          !/^[2-9]\d{11}$/.test(aadhaar)
        ) {
          return J({ error: 'bad' }, 400);
        }
        if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return J({ error: 'bad' }, 400);
        if (licenseNo && !/^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(licenseNo)) return J({ error: 'bad' }, 400);

        const photoParsed = parseDataUrl(a.photo, false);
        const docParsed = parseDataUrl(a.doc, true);
        if (!photoParsed || !docParsed) return J({ error: 'bad' }, 400);

        const panParsed = a.panDoc ? parseDataUrl(a.panDoc, true) : null;
        if (a.panDoc && !panParsed) return J({ error: 'bad' }, 400);

        const licParsed = a.licenseDoc ? parseDataUrl(a.licenseDoc, true) : null;
        if (a.licenseDoc && !licParsed) return J({ error: 'bad' }, 400);

        // Idempotency check if the same application ID was already submitted
        const dupRes = await sbRest(
          env,
          'employee_applications?id=eq.' + encodeURIComponent(id) + '&select=id'
        );
        if (dupRes.ok) {
          const dupRows = await dupRes.json().catch(() => []);
          if (Array.isArray(dupRows) && dupRows.length > 0) return J({ ok: true });
        }

        // Validate single-use invite token
        const invRes = await sbRest(
          env,
          'employee_invites?token=eq.' + encodeURIComponent(tok) + '&select=token,status,expires_at'
        );
        if (!invRes.ok) return J({ error: 'db_error' }, 500);
        const invRows = await invRes.json().catch(() => []);
        const inv = Array.isArray(invRows) ? invRows[0] : null;
        if (!inv || inv.status !== 'open') return J({ error: 'link_invalid' }, 403);
        if (inv.expires_at && !isNaN(Date.parse(inv.expires_at)) && Date.parse(inv.expires_at) <= Date.now()) {
          return J({ error: 'link_invalid' }, 403);
        }

        // Upload documents/photo to private 'employee-docs' bucket
        const photoPath = await uploadStorage(env, 'employee-docs', 'applications/' + id + '/photo.' + photoParsed.ext, photoParsed);
        const docPath = await uploadStorage(env, 'employee-docs', 'applications/' + id + '/aadhaar.' + docParsed.ext, docParsed);
        const panDocPath = panParsed
          ? await uploadStorage(env, 'employee-docs', 'applications/' + id + '/pan.' + panParsed.ext, panParsed)
          : '';
        const licenseDocPath = licParsed
          ? await uploadStorage(env, 'employee-docs', 'applications/' + id + '/license.' + licParsed.ext, licParsed)
          : '';

        const appliedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || ''))
          ? String(a.date)
          : new Date().toISOString().slice(0, 10);
        const submittedAt = a.submittedAt && !isNaN(Date.parse(a.submittedAt))
          ? new Date(a.submittedAt).toISOString()
          : new Date().toISOString();

        // Mask PII before storing in database (Data Minimization / UIDAI & DPDP compliance)
        const maskedAadhaar = 'XXXX XXXX ' + aadhaar.slice(-4);
        const maskedPan = pan ? pan.slice(0, 2) + '*****' + pan.slice(-2) : '';
        const maskedLicense = licenseNo ? 'XXXX-XXXX-' + licenseNo.slice(-4) : '';

        // Insert into employee_applications
        const insRes = await sbRest(env, 'employee_applications', {
          method: 'POST',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({
            id,
            invite_token: tok,
            applied_date: appliedDate,
            submitted_at: submittedAt,
            name,
            mobile,
            address,
            aadhaar: maskedAadhaar,
            pan: maskedPan,
            license_no: maskedLicense,
            photo_path: photoPath,
            doc_path: docPath,
            doc_type: docParsed.docType,
            pan_doc_path: panDocPath,
            pan_doc_type: panParsed ? panParsed.docType : null,
            license_doc_path: licenseDocPath,
            license_doc_type: licParsed ? licParsed.docType : null,
            status: 'Pending'
          })
        });
        if (!insRes.ok) return J({ error: 'db_error' }, 500);

        // Mark invite as used
        await sbRest(env, 'employee_invites?token=eq.' + encodeURIComponent(tok), {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'used' })
        });

        return J({ ok: true });
      }

      // Public: fetch HR docs for #me= employee portal
      if (p === '/api/slips' && m === 'GET') {
        const tok = u.searchParams.get('tok') || '';
        if (!/^[a-z0-9]{16,40}$/.test(tok)) return J({ error: 'bad' }, 400);

        const r = await sbRest(
          env,
          'employee_hr_docs?portal_token=eq.' +
            encodeURIComponent(tok) +
            '&select=payload,created_at&order=created_at.desc&limit=48'
        );
        if (!r.ok) return J({ error: 'db_error' }, 500);
        const rows = await r.json().catch(() => []);
        const items = Array.isArray(rows) ? rows.map((x) => x.payload).filter(Boolean) : [];
        return J({ items });
      }

      // Owner-authenticated: publish pay slip or joining letter to employee_hr_docs
      if (p === '/api/slip' && m === 'POST') {
        const user = await verifyOwner(req, env);
        if (!user) return J({ error: 'unauthorized' }, 401);
        const tx = await req.text();
        if (tx.length > MAX_SLIP_BYTES) return J({ error: 'too_big' }, 413);
        let b;
        try {
          b = JSON.parse(tx);
        } catch (e) {
          return J({ error: 'bad' }, 400);
        }

        const tok = String((b && b.tok) || '');
        const item = b && b.item;
        const itemId = String((item && item.id) || '');
        const kind = String((item && item.k) || '');
        if (
          !/^[a-z0-9]{16,40}$/.test(tok) ||
          !item ||
          !/^[A-Za-z0-9_-]{4,40}$/.test(itemId) ||
          (kind !== 'p' && kind !== 'l')
        ) {
          return J({ error: 'bad' }, 400);
        }

        const empId = item.e && item.e.id ? String(item.e.id) : null;
        const createdAt = item.at && !isNaN(Date.parse(item.at))
          ? new Date(item.at).toISOString()
          : new Date().toISOString();

        const r = await sbRest(env, 'employee_hr_docs', {
          method: 'POST',
          headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            id: itemId,
            employee_id: empId,
            portal_token: tok,
            doc_kind: kind,
            month_ym: kind === 'p' ? String(item.m || '') || null : null,
            net_pay: kind === 'p' ? Number(item.net || 0) : null,
            payload: item,
            created_at: createdAt
          })
        });
        if (!r.ok) return J({ error: 'db_error' }, 500);
        return J({ ok: true });
      }

      // Owner-authenticated: list profiles with emails
      if (p === '/api/users' && m === 'GET') {
        const caller = await requireRole(req, env, ['owner']);
        if (!caller) return J({ error: 'unauthorized' }, 401);

        const profRes = await sbRest(
          env,
          'profiles?select=user_id,full_name,role,employee_id,active,created_at&order=created_at.asc'
        );
        if (!profRes.ok) return J({ error: 'db_error' }, 500);
        const profiles = await profRes.json().catch(() => []);

        const authRes = await sbAdmin(env, 'users?per_page=1000');
        if (!authRes.ok) return J({ error: 'admin_api_error' }, 500);
        const authData = await authRes.json().catch(() => ({}));
        const authUsers = Array.isArray(authData.users) ? authData.users : [];
        const emailMap = new Map();
        for (const u of authUsers) {
          if (u && u.id) emailMap.set(u.id, u.email || '');
        }

        const users = (Array.isArray(profiles) ? profiles : []).map((p) => ({
          user_id: p.user_id,
          email: emailMap.get(p.user_id) || '',
          full_name: p.full_name,
          role: p.role,
          employee_id: p.employee_id,
          active: p.active,
          created_at: p.created_at
        }));

        return J({ users });
      }

      // Owner-authenticated: create user and profile
      if (p === '/api/users' && m === 'POST') {
        const caller = await requireRole(req, env, ['owner']);
        if (!caller) return J({ error: 'unauthorized' }, 401);

        const b = await req.json().catch(() => null);
        if (!b) return J({ error: 'bad' }, 400);

        const email = String(b.email || '').trim().toLowerCase();
        const fullName = String(b.full_name || '').trim();
        const role = String(b.role || '').trim();
        const employeeId = b.employee_id ? String(b.employee_id).trim() : null;

        if (!email || email.length > 100 || !EMAIL_REGEX.test(email)) {
          return J({ error: 'invalid_email' }, 400);
        }
        if (!fullName || fullName.length < 2 || fullName.length > 100) {
          return J({ error: 'invalid_name' }, 400);
        }
        if (!ALLOWED_ROLES.includes(role)) {
          return J({ error: 'invalid_role' }, 400);
        }
        if (employeeId && (employeeId.length < 1 || employeeId.length > 40)) {
          return J({ error: 'invalid_employee_id' }, 400);
        }

        const tempPassword = generateTempPassword(16);

        // Create user in Supabase Auth Admin API
        const createRes = await sbAdmin(env, 'users', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              must_change_password: true
            }
          })
        });

        if (!createRes.ok) {
          const errObj = await createRes.json().catch(() => ({}));
          const msg = errObj.msg || errObj.message || 'create_user_failed';
          return J({ error: msg }, createRes.status === 422 ? 409 : 400);
        }

        const createdAuthUser = await createRes.json().catch(() => null);
        if (!createdAuthUser || !createdAuthUser.id) {
          return J({ error: 'create_user_failed' }, 500);
        }

        const newUserId = createdAuthUser.id;
        const profilePayload = {
          user_id: newUserId,
          full_name: fullName,
          role,
          employee_id: employeeId,
          active: true
        };

        const profRes = await sbRest(env, 'profiles', {
          method: 'POST',
          headers: { prefer: 'return=representation' },
          body: JSON.stringify(profilePayload)
        });

        if (!profRes.ok) {
          // Rollback: delete created auth user
          await sbAdmin(env, 'users/' + encodeURIComponent(newUserId), { method: 'DELETE' }).catch(() => {});
          return J({ error: 'profile_insert_failed' }, 500);
        }

        const createdProfiles = await profRes.json().catch(() => []);
        const createdProfile =
          Array.isArray(createdProfiles) && createdProfiles.length > 0 ? createdProfiles[0] : profilePayload;

        return J(
          {
            ok: true,
            user: {
              user_id: newUserId,
              email,
              full_name: createdProfile.full_name,
              role: createdProfile.role,
              employee_id: createdProfile.employee_id,
              active: createdProfile.active,
              created_at: createdProfile.created_at
            },
            temporary_password: tempPassword
          },
          201
        );
      }

      // Owner-authenticated: update role or active status
      const userPatchMatch = /^\/api\/users\/([0-9a-fA-F-]{36})$/.exec(p);
      if (userPatchMatch && m === 'PATCH') {
        const caller = await requireRole(req, env, ['owner']);
        if (!caller) return J({ error: 'unauthorized' }, 401);

        const targetId = userPatchMatch[1];
        if (!isValidUUID(targetId)) return J({ error: 'bad_id' }, 400);

        const b = await req.json().catch(() => null);
        if (!b) return J({ error: 'bad' }, 400);

        if (b.role !== undefined && !ALLOWED_ROLES.includes(b.role)) {
          return J({ error: 'invalid_role' }, 400);
        }
        if (b.active !== undefined && typeof b.active !== 'boolean') {
          return J({ error: 'invalid_active' }, 400);
        }

        const curRes = await sbRest(
          env,
          'profiles?user_id=eq.' + encodeURIComponent(targetId) + '&select=user_id,full_name,role,employee_id,active'
        );
        if (!curRes.ok) return J({ error: 'db_error' }, 500);
        const curRows = await curRes.json().catch(() => []);
        const targetProfile = Array.isArray(curRows) && curRows.length > 0 ? curRows[0] : null;
        if (!targetProfile) return J({ error: 'user_not_found' }, 404);

        // An owner cannot deactivate or demote themselves
        if (caller.user.id === targetId) {
          if (b.active === false) {
            return J({ error: 'cannot_deactivate_self' }, 400);
          }
          if (b.role !== undefined && b.role !== 'owner') {
            return J({ error: 'cannot_demote_self' }, 400);
          }
        }

        // There must always be at least one active owner
        const isDemoting = b.role !== undefined && b.role !== 'owner' && targetProfile.role === 'owner';
        const isDeactivating = b.active === false && targetProfile.active === true;
        if (targetProfile.role === 'owner' && targetProfile.active === true && (isDemoting || isDeactivating)) {
          const activeOwners = await countActiveOwners(env);
          if (activeOwners <= 1) {
            return J({ error: 'cannot_remove_last_active_owner' }, 400);
          }
        }

        // If deactivating, call admin API to sign out and ban user; unban if activating
        if (b.active !== undefined && b.active !== targetProfile.active) {
          const banDuration = b.active ? 'none' : '876000h';
          const banRes = await sbAdmin(env, 'users/' + encodeURIComponent(targetId), {
            method: 'PUT',
            body: JSON.stringify({ ban_duration: banDuration })
          });
          if (!banRes.ok) {
            return J({ error: 'admin_ban_failed' }, 500);
          }
        }

        const patchPayload = {};
        if (b.role !== undefined) patchPayload.role = b.role;
        if (b.active !== undefined) patchPayload.active = b.active;
        if (b.full_name !== undefined) {
          const fn = String(b.full_name).trim();
          if (fn.length < 2 || fn.length > 100) return J({ error: 'invalid_name' }, 400);
          patchPayload.full_name = fn;
        }
        if (b.employee_id !== undefined) {
          const eid = b.employee_id ? String(b.employee_id).trim() : null;
          if (eid && (eid.length < 1 || eid.length > 40)) return J({ error: 'invalid_employee_id' }, 400);
          patchPayload.employee_id = eid;
        }

        if (Object.keys(patchPayload).length === 0) {
          return J({ error: 'no_changes' }, 400);
        }

        const updRes = await sbRest(env, 'profiles?user_id=eq.' + encodeURIComponent(targetId), {
          method: 'PATCH',
          headers: { prefer: 'return=representation' },
          body: JSON.stringify(patchPayload)
        });
        if (!updRes.ok) return J({ error: 'db_error' }, 500);
        const updatedRows = await updRes.json().catch(() => []);
        const updatedUser =
          Array.isArray(updatedRows) && updatedRows.length > 0
            ? updatedRows[0]
            : Object.assign({}, targetProfile, patchPayload);

        return J({ ok: true, user: updatedUser });
      }

      // Owner-authenticated: reset password with temporary password
      const pwResetMatch = /^\/api\/users\/([0-9a-fA-F-]{36})\/reset-password$/.exec(p);
      if (pwResetMatch && m === 'POST') {
        const caller = await requireRole(req, env, ['owner']);
        if (!caller) return J({ error: 'unauthorized' }, 401);

        const targetId = pwResetMatch[1];
        if (!isValidUUID(targetId)) return J({ error: 'bad_id' }, 400);

        const curRes = await sbRest(
          env,
          'profiles?user_id=eq.' + encodeURIComponent(targetId) + '&select=user_id,active'
        );
        if (!curRes.ok) return J({ error: 'db_error' }, 500);
        const curRows = await curRes.json().catch(() => []);
        if (!Array.isArray(curRows) || curRows.length === 0) {
          return J({ error: 'user_not_found' }, 404);
        }

        const tempPassword = generateTempPassword(16);

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
          return J({ error: 'password_reset_failed' }, 500);
        }

        return J({ ok: true, temporary_password: tempPassword });
      }

      // Authenticated user: clear must_change_password flag after password update
      if (p === '/api/me/password-changed' && m === 'POST') {
        const auth = req.headers.get('authorization') || '';
        if (!auth.toLowerCase().startsWith('bearer ')) return J({ error: 'unauthorized' }, 401);
        const token = auth.slice(7).trim();
        if (!token) return J({ error: 'unauthorized' }, 401);

        const r = await fetch(sbBase(env) + '/auth/v1/user', {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            authorization: 'Bearer ' + token
          }
        });
        if (!r.ok) return J({ error: 'unauthorized' }, 401);
        const u = await r.json().catch(() => null);
        if (!u || !u.id) return J({ error: 'unauthorized' }, 401);

        const adminRes = await sbAdmin(env, 'users/' + encodeURIComponent(u.id), {
          method: 'PUT',
          body: JSON.stringify({
            user_metadata: {
              must_change_password: false
            }
          })
        });

        if (!adminRes.ok) return J({ error: 'admin_api_error' }, 500);
        return J({ ok: true });
      }

      // Owner or Admin: 30-day application document and record retention cleanup
      if (p === '/api/retention/cleanup' && m === 'POST') {
        const caller = await requireRole(req, env, ['owner']);
        const isAdmin = same(req.headers.get('x-admin-key'), env.ADMIN_KEY);
        if (!caller && !isAdmin) return J({ error: 'unauthorized' }, 401);

        let rpcData = null;
        try {
          const rpcRes = await sbRest(env, 'rpc/cleanup_expired_applications', {
            method: 'POST',
            body: JSON.stringify({})
          });
          if (rpcRes.ok) {
            rpcData = await rpcRes.json().catch(() => null);
          }
        } catch (e) {}

        let deletedCount = 0;
        let deletedIds = [];
        let deletedPaths = [];

        if (rpcData && typeof rpcData.deleted_count === 'number') {
          deletedCount = rpcData.deleted_count;
          deletedIds = Array.isArray(rpcData.deleted_ids) ? rpcData.deleted_ids : [];
          deletedPaths = Array.isArray(rpcData.storage_paths) ? rpcData.storage_paths : [];
        } else {
          // Fallback: Query expired applications directly via REST
          const query = 'employee_applications?status=in.(Approved,Rejected)&select=id,photo_path,doc_path,pan_doc_path,license_doc_path,decided_at,submitted_at,retention_deadline';
          const expRes = await sbRest(env, query);
          if (expRes.ok) {
            const expRows = await expRes.json().catch(() => []);
            const nowMs = Date.now();
            const toDelete = (Array.isArray(expRows) ? expRows : []).filter((row) => {
              if (row.retention_deadline && !isNaN(Date.parse(row.retention_deadline))) {
                return Date.parse(row.retention_deadline) <= nowMs;
              }
              if (row.decided_at && !isNaN(Date.parse(row.decided_at))) {
                return Date.parse(row.decided_at) <= nowMs - 30 * 864e5;
              }
              if (row.submitted_at && !isNaN(Date.parse(row.submitted_at))) {
                return Date.parse(row.submitted_at) <= nowMs - 30 * 864e5;
              }
              return false;
            });

            if (toDelete.length > 0) {
              deletedIds = toDelete.map((x) => x.id);
              toDelete.forEach((x) => {
                if (x.photo_path) deletedPaths.push(x.photo_path);
                if (x.doc_path) deletedPaths.push(x.doc_path);
                if (x.pan_doc_path) deletedPaths.push(x.pan_doc_path);
                if (x.license_doc_path) deletedPaths.push(x.license_doc_path);
              });

              const delRes = await sbRest(
                env,
                'employee_applications?id=in.(' + deletedIds.map(encodeURIComponent).join(',') + ')',
                { method: 'DELETE' }
              );
              if (delRes.ok) {
                deletedCount = toDelete.length;
              }
            }
          }
        }

        let storageResult = { ok: true, deleted: 0 };
        if (deletedPaths.length > 0) {
          storageResult = await deleteStorage(env, 'employee-docs', deletedPaths);
        }

        return J({
          ok: true,
          deletedCount,
          deletedIds,
          storageFilesDeleted: storageResult.deleted || deletedPaths.length
        });
      }
    } catch (e) {
      return J({ error: 'server' }, 500);
    }

    return J({ error: 'not_found' }, 404);
  }
};

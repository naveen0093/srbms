// Larven Enterprises BMS - Cloudflare Pages worker (advanced mode)
// Needs: KV namespace bound as "KV", and a secret/variable "ADMIN_KEY".
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const MAX = 3 * 1024 * 1024;
function same(a, b) { a = String(a || ''); b = String(b || ''); if (a.length !== b.length || !b) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 }
function istNow() { const d = new Date(Date.now() + 19800000), x = d.toISOString(); return { date: x.slice(0, 10), time: x.slice(11, 19) } }
function hav(a, b, c, d) { const R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, k = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(k)) }
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (!env.KV || !env.ADMIN_KEY) return J({ error: 'not_configured' }, 503);
    const admin = same(req.headers.get('x-admin-key'), env.ADMIN_KEY);
    const p = u.pathname, m = req.method;
    try {
      if (p === '/api/ping' && m === 'GET') return admin ? J({ ok: true }) : J({ error: 'unauthorized' }, 401);
      if (p === '/api/invite' && m === 'POST') {
        if (!admin) return J({ error: 'unauthorized' }, 401);
        const b = await req.json();
        if (!/^[a-z0-9]{6,16}$/.test(String(b.t || ''))) return J({ error: 'bad' }, 400);
        await env.KV.put('inv:' + b.t, '1', { expirationTtl: 60 * 60 * 24 * 30 });
        return J({ ok: true });
      }
      if (p === '/api/apply' && m === 'POST') {
        const tx = await req.text();
        if (tx.length > MAX) return J({ error: 'too_big' }, 413);
        let a; try { a = JSON.parse(tx) } catch (e) { return J({ error: 'bad' }, 400) }
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
        const e = await env.KV.get('emp:' + t); if (!e) return J({ error: 'unknown_emp' }, 404);
        const emp = JSON.parse(e), cs = await env.KV.get('cfg:sites'), cfg = cs ? JSON.parse(cs) : { sites: [] };
        const rec = await env.KV.get('a:' + istNow().date + ':' + emp.id);
        return J({ name: emp.name, sites: (cfg.sites || []).map(x => x.name), today: rec ? JSON.parse(rec) : null, date: istNow().date });
      }
      if (p === '/api/att' && m === 'POST') {
        const tx = await req.text();
        if (tx.length > 250000) return J({ error: 'too_big' }, 413);
        let b; try { b = JSON.parse(tx) } catch (e) { return J({ error: 'bad' }, 400) }
        if (!b || !/^[a-z0-9]{16,40}$/.test(String(b.tok || '')) || (b.kind !== 'in' && b.kind !== 'out')) return J({ error: 'bad' }, 400);
        const e = await env.KV.get('emp:' + b.tok); if (!e) return J({ error: 'unknown_emp' }, 404);
        const emp = JSON.parse(e), q = String(b.code || '').split('|');
        if (q.length !== 3 || q[0] !== 'SRATT') return J({ error: 'bad_code' }, 400);
        const cs = await env.KV.get('cfg:sites'); const cfg = cs ? JSON.parse(cs) : { sites: [] };
        const site = (cfg.sites || []).find(x => x.id === q[1]);
        if (!site || !same(q[2], site.code)) return J({ error: 'bad_code' }, 400);
        let dist = null;
        if (site.lat != null && site.lng != null) {
          const la = Number(b.lat), ln = Number(b.lng);
          if (!isFinite(la) || !isFinite(ln) || b.lat == null) return J({ error: 'location_required' }, 400);
          dist = Math.round(hav(site.lat, site.lng, la, ln));
          const acc = Math.min(Math.max(Number(b.acc) || 0, 0), 60);
          if (dist > (Number(site.r) || 100) + acc) return J({ error: 'too_far', dist, site: site.name, r: Number(site.r) || 100 }, 403);
        }
        const ph = String(b.photo || '');
        if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(ph) || ph.length > 200000) return J({ error: 'bad_photo' }, 400);
        const n = istNow(), key = 'a:' + n.date + ':' + emp.id, old = await env.KV.get(key);
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
        const tx = await req.text();
        if (tx.length > 60000) return J({ error: 'too_big' }, 413);
        const b = JSON.parse(tx);
        if (!/^[a-z0-9]{16,40}$/.test(String(b.tok || '')) || !b.item || !/^[A-Za-z0-9_-]{4,40}$/.test(String(b.item.id || ''))) return J({ error: 'bad' }, 400);
        const old = await env.KV.get('slips:' + b.tok);
        let a = old ? JSON.parse(old) : [];
        a = a.filter(x => x.id !== b.item.id); a.push(b.item); a = a.slice(-48);
        await env.KV.put('slips:' + b.tok, JSON.stringify(a));
        return J({ ok: true });
      }
      if (!admin) return J({ error: 'unauthorized' }, 401);
      if (p === '/api/att/setup' && m === 'POST') {
        const tx = await req.text();
        if (tx.length > 200000) return J({ error: 'too_big' }, 413);
        const b = JSON.parse(tx);
        const sites = (b.sites || []).filter(x => /^[A-Za-z0-9_-]{1,20}$/.test(String(x.id || '')) && /^[A-Za-z0-9]{6,40}$/.test(String(x.code || ''))).slice(0, 20).map(x => ({ id: x.id, name: String(x.name || '').slice(0, 60), code: x.code, lat: x.lat == null || x.lat === '' ? null : Number(x.lat), lng: x.lng == null || x.lng === '' ? null : Number(x.lng), r: Math.max(20, Math.min(2000, Number(x.r) || 100)) }));
        await env.KV.put('cfg:sites', JSON.stringify({ sites }));
        let n = 0;
        for (const e of (b.emps || []).slice(0, 300)) { if (/^[a-z0-9]{16,40}$/.test(String(e.tok || '')) && /^[A-Za-z0-9_-]{1,20}$/.test(String(e.id || ''))) { await env.KV.put('emp:' + e.tok, JSON.stringify({ id: e.id, name: String(e.name || '').slice(0, 60) })); n++ } }
        return J({ ok: true, sites: sites.length, emps: n });
      }
      if (p === '/api/atts' && m === 'GET') {
        const d = u.searchParams.get('date') || '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return J({ error: 'bad' }, 400);
        const l = await env.KV.list({ prefix: 'a:' + d + ':', limit: 500 }), items = [];
        for (const k of l.keys) { const v = await env.KV.get(k.name); if (v) items.push(JSON.parse(v)) }
        return J({ items });
      }
      if (p === '/api/att/photo' && m === 'GET') {
        const k = u.searchParams.get('k') || '';
        if (!/^ap:[\d-]+:[A-Za-z0-9_-]+:(in|out):\d+$/.test(k)) return J({ error: 'bad' }, 400);
        const v = await env.KV.get(k); return v ? J({ p: v }) : J({ error: 'none' }, 404);
      }
      if (p === '/api/apps' && m === 'GET') {
        const l = await env.KV.list({ prefix: 'app:', limit: 100 });
        return J({ ids: l.keys.map(k => k.name.slice(4)) });
      }
      if (p === '/api/app' && m === 'GET') {
        const v = await env.KV.get('app:' + (u.searchParams.get('id') || ''));
        return v ? new Response(v, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) : J({ error: 'none' }, 404);
      }
      if (p === '/api/app/delete' && m === 'POST') {
        const b = await req.json();
        await env.KV.delete('app:' + String(b.id || ''));
        return J({ ok: true });
      }
    } catch (e) { return J({ error: 'server' }, 500) }
    return J({ error: 'not_found' }, 404);
  }
};

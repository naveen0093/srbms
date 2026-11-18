// SR Industries BMS - Cloudflare Pages worker (advanced mode)
// Needs: KV namespace bound as "KV", and a secret/variable "ADMIN_KEY".
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const MAX = 3 * 1024 * 1024;
function same(a, b) { a = String(a || ''); b = String(b || ''); if (a.length !== b.length || !b) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 }
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

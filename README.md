# Larven Enterprises BMS (SR PLUS+)

```
larven-bms/
├─ public/                  <- Cloudflare Pages "build output directory"
│  ├─ index.html            the whole app (single file)
│  └─ _worker.js            API (invites, applications, attendance, payslips) – needs KV + ADMIN_KEY
├─ supabase/
│  ├─ migrations/001_init.sql   tables + roles + RLS
│  ├─ migrations/002_storage.sql private file buckets
│  └─ seed_owner.sql            make the first Owner login
├─ .gitignore  .dev.vars.example  README.md
```

## 1. Put on GitHub
```
cd larven-bms
git init && git add . && git commit -m "Initial BMS"
git branch -M main
git remote add origin https://github.com/<you>/larven-bms.git
git push -u origin main
```
Never commit ADMIN_KEY or Supabase service keys.

## 2. Cloudflare Pages from GitHub
Workers & Pages → Create → Pages → Connect to Git → pick repo.
- Framework preset: None · Build command: *(empty)* · Build output directory: `public`
After first deploy: Settings → Bindings → **KV namespace**, variable name exactly `KV` (create a namespace first under Storage & Databases → KV). Settings → Variables and Secrets → add secret `ADMIN_KEY`. Then redeploy.
Every `git push` to main redeploys automatically.

## 3. Supabase
1. Create project. 2. SQL Editor → run `001_init.sql`, then `002_storage.sql`.
3. Authentication → Users → add Owner, copy its UUID into `seed_owner.sql`, run it.
Design: each app collection = one table `(id text, data jsonb)`, ids identical to the app (C1, B1001…), so no field can mismatch; new app fields never need SQL changes.

## IMPORTANT (live data)
- The app currently saves data in the browser (localStorage). Supabase tables are ready but NOT yet connected to the app.
- A new domain/URL is a new browser storage: **Backup the data in the old app first and Restore in the new one.**
- The old deployed `_worker.js` lacks attendance (`/api/att*`, `/api/me`); this one has them.

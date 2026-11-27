# Larven Enterprises BMS (SR PLUS+)

A modern, enterprise-grade Business Management System (BMS) for packaged drinking water manufacturing, route distribution, retail billing, attendance, and operations.

```
larven-bms/
├─ public/                          <- Cloudflare Pages Build Output Directory
│  ├─ index.html                    <- CSP-compliant, standalone SPA entry point
│  ├─ app.js                        <- Frontend app (IndexedDB outbox, My Route, Day Close, HR)
│  ├─ _worker.js                    <- Cloudflare Worker API (Turnstile, Auth, RPC allowlist, Storage)
│  ├─ vendor/                       <- Vendored libraries (html2canvas, jsPDF, SheetJS, QRCode.js)
│  └─ assets/                       <- Optimized standalone assets (hero.jpg, watermark.png)
├─ supabase/
│  ├─ migrations/                   <- Sequential, timestamped SQL migrations
│  │  ├─ 20261127000001_core_schema.sql
│  │  ├─ 20261127000002_views_and_audit.sql
│  │  ├─ 20261127000003_roles_and_rls.sql
│  │  ├─ 20261127000004_rpcs.sql
│  │  ├─ 20261127000005_user_management.sql
│  │  ├─ 20261127000006_storage_policies.sql
│  │  ├─ 20261127000007_rpc_hardening.sql
│  │  └─ 20261127000008_attendance_and_hr.sql
│  ├─ apply_all.sql                 <- All migrations combined in single transaction order
│  └─ seed.test.sql                 <- Mock auth users & test data for the 4 roles
├─ scripts/
│  ├─ apply_migrations.mjs          <- Node migration runner (supports --dry-run)
│  └─ apply_migrations.sh           <- Shell migration runner
├─ tests/
│  ├─ test_smoke.mjs                <- Comprehensive test suite (npm test)
│  └─ role_matrix.sql               <- SQL role impersonation test suite (anon, employee, manager, owner, admin)
├─ docs/
│  ├─ flow-spec.md                  <- Full system flow specifications & sequence diagrams
│  └─ test-plan.md                  <- Quality assurance & test execution plan
├─ package.json
└─ README.md
```

---

## 1. Architecture Highlights

1. **Zero-Trust Backend Security**:
   - Strict Row-Level Security (RLS) across all PostgreSQL tables.
   - 12 `SECURITY DEFINER` write RPCs with explicit `search_path = public, pg_temp` and caller identity derived exclusively from `auth.uid()`.
   - Financial ledgers (`bills`, `bill_items`, `payments`, `fg_movements`, `expenses`, `advances`) are strictly append-only with NO `DELETE` policies for any role.
2. **Four-Tier Role Hierarchy & Duty Tags**:
   - Roles: `admin` (Rank 4) > `owner` (Rank 3) > `manager` (Rank 2) > `employee` (Rank 1).
   - Duty tags for field staff: `delivery`, `production`, `godown`.
   - Last-active owner protection prevents deleting or deactivating the sole owner.
3. **Offline-First Delivery Engine**:
   - Delivery routes execute online-first with transparent fallback to IndexedDB (`OutboxDB`).
   - Offline transactions receive provisional receipts (`PROV-TR101-...`).
   - Sequential replay on reconnect replaces provisional receipts with official tax invoice numbers (`SR/26-27/...`).
   - Server-rejected transactions move to a dedicated `needs_attention` queue with Retry and Dismiss options.
   - Outbox and trip caches persist across reloads and logouts.
4. **Attendance, Privacy & Storage**:
   - QR geofence scanning (`SRATT|<siteId>|<code>`) with browser camera selfie verification.
   - Candidate job applications enforce Aadhaar number masking (`XXXX-XXXX-1234`) before database storage.
   - Private Supabase Storage buckets (`employee-docs`, `vehicle-evidence`) accessed exclusively via temporary signed URLs.
5. **Frozen & Isolated Café Module**:
   - Stored in browser `localStorage` under `larven-cafe-v1`.
   - Zero database tables, zero backend dependencies, and hidden from employee navigation.

---

## 2. Environment Configuration

Configure the following environment variables in your Cloudflare Pages dashboard (under **Settings → Variables and Secrets**):

| Variable | Description | Required |
|:---|:---|:---:|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xyzcompany.supabase.co`) | Yes |
| `SUPABASE_ANON_KEY` | Public anon key for client-side API authentication | Yes |
| `SUPABASE_SERVICE_ROLE_KEY`| Service role key for administrative endpoints and user creation | Yes |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (fails closed if omitted or invalid) | Yes |

> [!CAUTION]
> Never commit `SUPABASE_SERVICE_ROLE_KEY` or `TURNSTILE_SECRET_KEY` to source control.

---

## 3. Database Migrations

Apply migrations to an empty Supabase project in sequential timestamp order:

```bash
# Dry-run validation of all migration files:
node scripts/apply_migrations.mjs --dry-run

# Apply via psql:
psql "$SUPABASE_DB_URL" -f supabase/apply_all.sql
```

### Initial Administrator Bootstrap
To create the initial Owner account, insert into Supabase Auth and Profiles:
```sql
-- Run in Supabase SQL Editor:
INSERT INTO public.profiles (id, full_name, role, phone, active)
VALUES ('<AUTH_USER_UUID>', 'Muni Prasad', 'owner', '9848000002', true)
ON CONFLICT (id) DO UPDATE SET role = 'owner', active = true;
```

---

## 4. Running Locally

### Development Server
Run a local web server pointing to the `public/` folder:
```powershell
npx wrangler pages dev public --port 8788
```

### Running Test Suites
```powershell
# 1. Run full unit and smoke test suite:
npm test

# 2. Run PostgreSQL role matrix impersonation test (in psql or SQL editor):
psql "$SUPABASE_DB_URL" -f supabase/seed.test.sql -f tests/role_matrix.sql
```

---

## 5. Deployment to Cloudflare Pages

1. Push repository to GitHub.
2. In Cloudflare Dashboard: **Workers & Pages → Create Application → Pages → Connect to Git**.
3. Select the repository:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `public`
4. Under **Settings → Variables and Secrets**, add the 4 environment variables listed in Section 2.
5. Deploy. Every push to the main branch will trigger an automated zero-downtime deployment.

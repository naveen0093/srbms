# SR Industries BMS (Business Management System)

A web-based Business Management System designed for bottling plant operations, managing invoicing, credit ledgers, inventory, cash receipts, salary advances, employee records, and audit compliance.

---

## Architecture & Folder Layout

```
srbms/
├── public/                # Cloudflare Pages build output directory (public assets & edge worker)
│   ├── index.html         # Single-Page Application (SPA) entry point
│   ├── app.js             # Frontend application logic, state, and UI rendering
│   ├── _worker.js         # Cloudflare Pages Worker (API gateway, security headers, document intake)
│   └── vendor/            # Vendored frontend libraries (zero CDN dependencies)
│       ├── html2canvas.min.js # Canvas screenshot utility (v1.4.1)
│       ├── jspdf.umd.min.js   # PDF generation (v4.2.1)
│       ├── supabase.min.js    # Supabase JavaScript Client (v2.119.2)
│       ├── xlsx.full.min.js   # Spreadsheet export/import (v0.20.3)
│       └── README.md          # Version, source URL, and license inventory
├── docs/
│   └── test-plan.md       # Comprehensive RBAC & security test matrix
├── tests/
│   ├── test_vendor_csp_appjs.mjs          # CSP, vendor integrity, and app.js syntax test suite
│   ├── test_pii_masking_and_retention.mjs # PII masking and document retention lifecycle test suite
│   └── test_public_isolation.mjs          # Asserts non-public directories are unreachable
├── supabase/
│   ├── migrations/        # Sequential SQL migrations for PostgreSQL
│   └── seed.test.sql      # Optional mock users for test projects (gitignored)
├── .dev.vars.example      # Template for local development environment variables
├── .gitignore             # Git ignore specification
├── package.json           # Test runner script configuration
└── README.md              # Project documentation and deployment guide
```

---

## Required Cloudflare Pages Variables

Configure the following environment variables in Cloudflare Pages (**Settings** -> **Environment variables**):

| Variable Name | Type | Purpose |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Plain text | The HTTPS API URL of your Supabase project (e.g. `https://xyz.supabase.co`) |
| `SUPABASE_ANON_KEY` | Plain text | The public anonymous key for client session establishment |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret (Encrypted)** | Elevated service role key used **only** inside `_worker.js` for admin RPC calls and private storage buckets |

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY` must **ALWAYS** be configured as an **Encrypted Secret** in Cloudflare Pages and local `.dev.vars`. **NEVER commit keys or tokens to Git.**

### Preview vs Production Variables
Maintain separate Supabase projects for staging and production:
- In Cloudflare Pages, configure environment variables separately for **Production** and **Preview** branches.
- Point **Preview** environments to a dedicated test/scratch Supabase instance.
- Point **Production** environments to the hardened production Supabase instance.

---

## Migration Sequence

Apply migrations in exact alphabetical order in the Supabase SQL Editor:

1. `supabase/migrations/20261119000000_initial_schema.sql` — Base schema provisioning 15 application tables, storage buckets (`employee-docs`, `vehicle-evidence`), and initial blanket RLS policies.
2. `supabase/migrations/20261119122000_remove_data_destroying_paths.sql` — Adds customer active status and removes obsolete PIN reset columns.
3. `supabase/migrations/20261119125500_roles_rls.sql` — Provisions RBAC profiles, roles enum (`owner`, `manager`, `accountant`, `billing_staff`, `driver`), isolates confidential employee identities, and applies strict RLS policies.
4. `supabase/migrations/20261120102500_atomic_rpcs_sequences.sql` — Adds Postgres sequences for billing numbers and atomic transaction RPCs (`create_bill`, `record_payment`, etc.).
5. `supabase/migrations/20261120110000_audit_log_trail.sql` — Append-only audit logging table and triggers with PII masking and owner-only access.
6. `supabase/migrations/20261120113000_pii_masking_and_retention.sql` — Populates `last4` identifiers, masks historical plaintext PII, and introduces the 30-day applicant retention lifecycle.
7. `supabase/migrations/20261120124500_rpc_fixes.sql` — Fixes payment reversal unassigned record check on advance payments, drops legacy `bill_items_delete`, and revokes public function permissions.
8. `supabase/migrations/20261120130000_security_review_hardening.sql` — Enforces RPC-only ledger mutations (drops `INSERT`/`UPDATE` policies on bills and payments), adds role checks on sequences, removes actor parameters from cancel/reverse RPCs, and guards retention cleanup with `service_role`/`owner`.

> [!WARNING]
> **PII Migration is Irreversible**: `20261120113000_pii_masking_and_retention.sql` permanently masks stored Aadhaar, PAN, and Driver Licence numbers (`XXXX XXXX 1234`, `AB*****34`). This operation is one-way and cannot be decrypted without external backups.
>
> **Test on Scratch Project First**: Always apply and verify the entire migration chain on a blank scratch Supabase project before executing on production.

---

## Production Hardening Checklist

### 1. Disable Public User Sign-Ups
1. In the Supabase Dashboard, navigate to **Authentication** -> **Providers** -> **Email**.
2. Uncheck **Enable Signups**.
3. Save changes. Only existing administrators or the owner can create users via the dashboard or invite flow.

### 2. Multi-Factor Authentication (MFA) for Owners
All accounts assigned the `owner` role must enable Multi-Factor Authentication:
1. In Supabase Dashboard -> **Authentication** -> **Policies**, configure MFA enforcement if available on your plan.
2. Require owners to enroll an Authenticator App (TOTP) upon initial sign-in.

### 3. Initial Setup: Creating the First Owner
1. In Supabase Dashboard -> **Authentication** -> **Users**, click **Add User** -> **Create User**.
2. Supply the owner's email address and a strong password. Note the generated `user_id` (UUID).
3. Open the Supabase **SQL Editor** and run:
   ```sql
   INSERT INTO public.profiles (user_id, full_name, role, employee_id, active)
   VALUES ('<OWNER_USER_UUID>', 'System Administrator', 'owner', NULL, true)
   ON CONFLICT (user_id) DO UPDATE SET role = 'owner', active = true;
   ```
4. Log into the application at your deployment URL. Once authenticated as owner, additional staff can be managed from the **Settings / User Management** tab.

---

## Deployment Instructions

### Cloudflare Pages
- **Framework preset**: `None`
- **Build command**: `None` (pure static client asset delivery with Worker edge runtime)
- **Build output directory**: `public`
- **Edge Worker**: `public/_worker.js` (automatically bundled and executed by Cloudflare Pages Advanced Mode)

### Asset Isolation
Files outside `public/` (including `supabase/`, `docs/`, `tests/`, `package.json`, and `.dev.vars`) are never deployed or accessible via HTTP. This isolation is verified by automated regression test `tests/test_public_isolation.mjs`.

### Running Tests Locally
```bash
npm test
```
Runs:
1. `tests/test_vendor_csp_appjs.mjs`: Checks SRI hashes, CSP headers, and syntax of `app.js`.
2. `tests/test_pii_masking_and_retention.mjs`: Tests PII masking functions, retention deadlines, and worker endpoints.
3. `tests/test_public_isolation.mjs`: Confirms private repository folders are completely excluded from `public/`.

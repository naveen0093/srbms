# SR Industries BMS - Security & Role-Based Access Control Test Plan

## 1. Overview & Security Architecture

This test plan defines the manual and programmatic verification procedures for role-based access control (RBAC), Row-Level Security (RLS), atomic RPC constraints, Data Minimization / PII masking, and public API resilience in SR Industries BMS.

### Architecture & Trust Boundaries
- **Frontend Client**: Vanilla Single-Page Application ([index.html](../public/index.html), [app.js](../public/app.js)).
- **Edge Worker**: Cloudflare Pages Worker ([_worker.js](../public/_worker.js)) acting as a secure gateway for admin APIs, invite generation, application intake, and CSP header injection.
- **Database & Storage**: Supabase PostgreSQL with RLS, atomic RPC functions (`SECURITY DEFINER`), Postgres sequences for financial-year billing numbers, and private Storage buckets (`employee-docs`).

### Roles Matrix Summary
| Role | Business Function | Page Count | Navigation Access | Key Restrictions |
| :--- | :--- | :---: | :--- | :--- |
| **`owner`** | Complete business ownership | 25 | All pages | Cannot delete bills/payments directly (must cancel/reverse); cannot delete audit trail; cannot demote last active owner. |
| **`manager`** | Plant operations & supervisory management | 21 | Operations, billing, staff, stock, reports | Cannot view Activity Log, User Management, Business Settings, or Backup Export; cannot read employee identities/Aadhaar. |
| **`accountant`** | Financial audits, payments, and payouts | 18 | Finance, payments, bills, stock views, reports | Cannot create/cancel bills; cannot record stock in/out; cannot manage employees/settings; cannot read employee identities/Aadhaar. |
| **`billing_staff`**| Counter sales, invoicing, customer intake | 7 | Billing group, basic stock view | Cannot reverse payments; cannot view expenses, salaries, employees, or reports; cannot read employee identities/Aadhaar. |
| **`driver`** | Delivery & transport logistics | 1 | Vehicles page only | Read-only access to assigned vehicle; can only record odometer trips; zero access to financial or customer data. |

---

## 2. Role-by-Role Test Specifications

### Table 1: `owner` Role Test Specification

| Category | Specification & Test Items |
| :--- | :--- |
| **Pages Visible (25)** | `dashboard`, `new-bill`, `bills`, `customers`, `payments`, `outstanding`, `stock-in`, `stock-out`, `current-stock`, `stock-history`, `diesel`, `expenses`, `employees`, `attendance`, `timings`, `advances`, `vehicles`, `rep-sales`, `rep-pay`, `rep-stock`, `rep-exp`, `backup`, `settings`, `users`, `activity-log` |
| **Actions Allowed** | `create_bill`, `cancel_bill`, `edit_bill`, `create_customer`, `edit_customer`, `create_payment`, `reverse_payment`, `stock_in`, `stock_out`, `create_expense`, `delete_expense`, `manage_employees`, `manage_attendance`, `manage_advances`, `manage_vehicles`, `manage_settings`, `manage_users`, `view_activity_log`, `export_backup` |
| **Direct API Calls That Must Be REJECTED** | **1. Direct DELETE on bills (Bills are immutable; cancellation must be recorded via RPC):**<br>```javascript<br>const { error } = await supabase.from('bills').delete().eq('id', 'B001');<br>// MUST FAIL: RLS policy denies DELETE on public.bills<br>```<br>**2. Direct DELETE on payments (Payments are immutable; reversals must be recorded via RPC):**<br>```javascript<br>const { error } = await supabase.from('payments').delete().eq('id', 'P001');<br>// MUST FAIL: RLS policy denies DELETE on public.payments<br>```<br>**3. Direct DELETE or UPDATE on audit log (Append-only audit trail):**<br>```javascript<br>const { error } = await supabase.from('audit_log').delete().neq('id', '0');<br>// MUST FAIL: RLS policy denies UPDATE and DELETE on public.audit_log for all roles<br>```<br>**4. Self-demoting or deactivating the last active owner:**<br>```javascript<br>const { error } = await fetch('/api/users/' + currentOwnerId, {<br>  method: 'PATCH',<br>  headers: { authorization: 'Bearer ' + ownerToken, 'content-type': 'application/json' },<br>  body: JSON.stringify({ role: 'manager' })<br>});<br>// MUST FAIL: 400 Bad Request ("Cannot change role: at least one active owner must remain")<br>``` |

---

### Table 2: `manager` Role Test Specification

| Category | Specification & Test Items |
| :--- | :--- |
| **Pages Visible (21)** | `dashboard`, `new-bill`, `bills`, `customers`, `payments`, `outstanding`, `stock-in`, `stock-out`, `current-stock`, `stock-history`, `diesel`, `expenses`, `employees`, `attendance`, `timings`, `advances`, `vehicles`, `rep-sales`, `rep-pay`, `rep-stock`, `rep-exp` |
| **Pages Hidden / Denied (4)**| `backup`, `settings`, `users`, `activity-log` |
| **Actions Allowed** | `create_bill`, `cancel_bill`, `edit_bill`, `create_customer`, `edit_customer`, `create_payment`, `reverse_payment`, `stock_in`, `stock_out`, `create_expense`, `delete_expense`, `manage_employees`, `manage_attendance`, `manage_advances`, `manage_vehicles` |
| **Direct API Calls That Must Be REJECTED** | **1. Reading employee identities (Aadhaar, PAN, DL documents):**<br>```javascript<br>const { data, error } = await supabase.from('employee_identities').select('*');<br>// MUST FAIL: returns empty data ([]) or error; RLS allows SELECT only to owner<br>```<br>**2. Accessing owner-only Activity Log:**<br>```javascript<br>const { data, error } = await supabase.from('audit_log').select('*');<br>// MUST FAIL: RLS policy audit_log_select_policy allows only owner<br>```<br>**3. Modifying business settings:**<br>```javascript<br>const { error } = await supabase.from('business_settings').update({ name: 'Hacked' }).eq('id', 1);<br>// MUST FAIL: RLS policy business_settings_update_policy allows only owner<br>```<br>**4. Elevating own role to owner:**<br>```javascript<br>const { error } = await supabase.from('profiles').update({ role: 'owner' }).eq('user_id', managerId);<br>// MUST FAIL: RLS policy profiles_update_policy allows only owner to modify roles<br>```<br>**5. Invoking User Management API in Worker:**<br>```javascript<br>const res = await fetch('/api/users', { headers: { authorization: 'Bearer ' + managerToken } });<br>// MUST FAIL: HTTP 401 Unauthorized (requireRole denies non-owner)<br>```<br>**6. Running application retention cleanup:**<br>```javascript<br>const res = await fetch('/api/retention/cleanup', { method: 'POST', headers: { authorization: 'Bearer ' + managerToken } });<br>// MUST FAIL: HTTP 401 Unauthorized<br>``` |

---

### Table 3: `accountant` Role Test Specification

| Category | Specification & Test Items |
| :--- | :--- |
| **Pages Visible (18)** | `dashboard`, `bills`, `customers`, `payments`, `outstanding`, `current-stock`, `stock-history`, `diesel`, `expenses`, `employees`, `attendance`, `timings`, `advances`, `vehicles`, `rep-sales`, `rep-pay`, `rep-stock`, `rep-exp` |
| **Pages Hidden / Denied (7)**| `new-bill`, `stock-in`, `stock-out`, `backup`, `settings`, `users`, `activity-log` |
| **Actions Allowed** | `create_payment`, `reverse_payment`, `create_expense`, `delete_expense`, `manage_advances`, `manage_payslips` |
| **Direct API Calls That Must Be REJECTED** | **1. Creating a bill via RPC:**<br>```javascript<br>const { error } = await supabase.rpc('create_bill', {<br>  p_customer: { name: 'Acct Test' },<br>  p_items: [{ name: '20L Jar', qty: 10, rate: 30, amount: 300 }],<br>  p_subtotal: 300, p_discount: 0, p_tax: 0, p_total: 300, p_bill_date: '2026-11-20', p_notes: ''<br>});<br>// MUST FAIL: RPC raises exception "Permission denied: insufficient privileges to create bills"<br>```<br>**2. Cancelling a bill via RPC:**<br>```javascript<br>const { error } = await supabase.rpc('cancel_bill', { p_bill_id: 'B001', p_reason: 'Acct cancel' });<br>// MUST FAIL: RPC raises exception "Permission denied: insufficient privileges to cancel bills"<br>```<br>**3. Recording stock in/out movement:**<br>```javascript<br>const { error } = await supabase.from('stock_movements').insert({<br>  id: 'SM01', movement_date: '2026-11-20', type: 'In', item_name: 'Raw Caps', quantity: 500<br>});<br>// MUST FAIL: RLS policy stock_movements_insert_policy denies accountant<br>```<br>**4. Reading employee identities / Aadhaar:**<br>```javascript<br>const { data } = await supabase.from('employee_identities').select('aadhaar, pan');<br>// MUST FAIL: Returns [] or error (owner-only RLS)<br>```<br>**5. Creating new employees:**<br>```javascript<br>const { error } = await supabase.from('employees').insert({ id: 'M99', name: 'Ghost Staff', role: 'Helper', salary: 10000 });<br>// MUST FAIL: RLS policy employees_insert_policy denies accountant<br>``` |

---

### Table 4: `billing_staff` Role Test Specification

| Category | Specification & Test Items |
| :--- | :--- |
| **Pages Visible (7)** | `dashboard`, `new-bill`, `bills`, `customers`, `payments`, `outstanding`, `current-stock` |
| **Pages Hidden / Denied (18)**| `stock-in`, `stock-out`, `stock-history`, `diesel`, `expenses`, `employees`, `attendance`, `timings`, `advances`, `vehicles`, `rep-sales`, `rep-pay`, `rep-stock`, `rep-exp`, `backup`, `settings`, `users`, `activity-log` |
| **Actions Allowed** | `create_bill`, `cancel_bill`, `create_customer`, `edit_customer`, `create_payment` |
| **Direct API Calls That Must Be REJECTED** | **1. Reversing a payment via RPC:**<br>```javascript<br>const { error } = await supabase.rpc('reverse_payment', { p_payment_id: 'P001', p_reason: 'Clerk reverse' });<br>// MUST FAIL: RPC raises exception "Permission denied: only owner, manager, or accountant can reverse payments"<br>```<br>**2. Recording expenses (diesel or general):**<br>```javascript<br>const { error } = await supabase.from('expenses').insert({<br>  id: 'E99', exp_date: '2026-11-20', category: 'Tea', amount: 50, paid_by: 'Cash'<br>});<br>// MUST FAIL: RLS policy expenses_insert_policy denies billing_staff<br>```<br>**3. Recording attendance:**<br>```javascript<br>const { error } = await supabase.from('attendance').insert({<br>  id: 'A99', att_date: '2026-11-20', employee_id: 'M01', status: 'Present'<br>});<br>// MUST FAIL: RLS policy attendance_insert_policy denies billing_staff<br>```<br>**4. Recording salary advances:**<br>```javascript<br>const { error } = await supabase.from('advances').insert({<br>  id: 'V99', adv_date: '2026-11-20', employee_id: 'M01', amount: 1000<br>});<br>// MUST FAIL: RLS policy advances_insert_policy denies billing_staff<br>```<br>**5. Reading employee identities / Aadhaar:**<br>```javascript<br>const { data } = await supabase.from('employee_identities').select('*');<br>// MUST FAIL: Returns [] or error (owner-only RLS)<br>``` |

---

### Table 5: `driver` Role Test Specification

| Category | Specification & Test Items |
| :--- | :--- |
| **Pages Visible (1)** | `vehicles` |
| **Pages Hidden / Denied (24)**| `dashboard`, `new-bill`, `bills`, `customers`, `payments`, `outstanding`, `stock-in`, `stock-out`, `current-stock`, `stock-history`, `diesel`, `expenses`, `employees`, `attendance`, `timings`, `advances`, `rep-sales`, `rep-pay`, `rep-stock`, `rep-exp`, `backup`, `settings`, `users`, `activity-log` |
| **Actions Allowed** | `record_trip` |
| **Direct API Calls That Must Be REJECTED** | **1. Reading bills:**<br>```javascript<br>const { data } = await supabase.from('bills').select('*');<br>// MUST FAIL: returns [] (RLS denies SELECT on bills for driver)<br>```<br>**2. Reading customer list:**<br>```javascript<br>const { data } = await supabase.from('customers').select('*');<br>// MUST FAIL: returns [] (RLS denies SELECT on customers for driver)<br>```<br>**3. Reading payments:**<br>```javascript<br>const { data } = await supabase.from('payments').select('*');<br>// MUST FAIL: returns [] (RLS denies SELECT on payments for driver)<br>```<br>**4. Reading expenses:**<br>```javascript<br>const { data } = await supabase.from('expenses').select('*');<br>// MUST FAIL: returns [] (RLS denies SELECT on expenses for driver)<br>```<br>**5. Reading employees or employee identities:**<br>```javascript<br>const { data } = await supabase.from('employees').select('*');<br>// MUST FAIL: returns [] (RLS denies SELECT on employees for driver)<br>```<br>**6. Creating or modifying vehicle records:**<br>```javascript<br>const { error } = await supabase.from('vehicles').insert({ id: 'V99', vehicle_number: 'AP04XX1234', vehicle_type: 'Truck' });<br>// MUST FAIL: RLS policy vehicles_insert_policy allows only owner and manager<br>``` |

---

## 3. System-Wide Security & Edge-Case Tests

### Test 1: Expired JWT Token
- **Target**: Cloudflare Pages Worker and Supabase PostgREST.
- **Payload**: Request with an Authorization header containing an expired JWT (`exp` timestamp in the past).
- **Execution**:
  ```bash
  curl -i http://127.0.0.1:8788/api/users \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTYiLCJleHAiOjE1MTYyMzkwMjJ9.4pzV3W83W_w"
  ```
- **Expected Result**:
  - Worker returns `401 Unauthorized` (`{"error":"unauthorized"}`).
  - Supabase client throws `JWT expired` and redirects user to sign-in screen.

---

### Test 2: Deactivated User (`active = false`)
- **Target**: RLS policies and Worker API authentication.
- **Setup**: In database, update user profile:
  ```sql
  UPDATE public.profiles SET active = false WHERE user_id = '<user_uuid>';
  ```
- **Execution**:
  1. Authenticate with valid email and password for this user.
  2. Invoke API call via Worker:
     ```javascript
     const res = await fetch('/api/users', { headers: { authorization: 'Bearer ' + token } });
     ```
  3. Query database via Supabase client:
     ```javascript
     const { data, error } = await supabase.from('bills').select('*');
     ```
- **Expected Result**:
  - Worker `requireRole` checks `profile.active`. Returns `401 Unauthorized`.
  - Frontend catches deactivated profile, displays modal `"Account not active. Contact owner."`, signs out session, and purges state.
  - PostgreSQL helper `is_active_user()` returns `false`, causing all RLS policies to evaluate to `false` (zero rows returned).

---

### Test 3: Authenticated User with No Profile
- **Target**: Account provisioning edge-case.
- **Setup**: Create an `auth.users` entry directly without inserting a corresponding row in `public.profiles`.
- **Execution**:
  ```javascript
  const { data: { session } } = await supabase.auth.signInWithPassword({ email: 'noprofile@test.com', password: 'Password123!' });
  const { data: bills } = await supabase.from('bills').select('*');
  ```
- **Expected Result**:
  - `has_role(...)` evaluates to `false` because no matching `profiles.role` exists.
  - All RLS queries return empty sets (`[]`).
  - Worker endpoints reject with `401 Unauthorized`.
  - Frontend prompts `"Profile not found"` and redirects to sign-in.

---

### Test 4: Public Sign-Up Attempt
- **Target**: Supabase Auth endpoint (`/auth/v1/signup`).
- **Execution**:
  ```javascript
  const { data, error } = await supabase.auth.signUp({
    email: 'hacker@malicious.com',
    password: 'Password123!'
  });
  ```
- **Expected Result**:
  - Request is rejected by Supabase Auth (`Signups not allowed for this instance` / `User signup is disabled`).
  - Self-registration is strictly disallowed; user creation is gated through the owner-only worker endpoint `POST /api/users`.

---

### Test 5: Privilege Escalation (Changing Own Role via API)
- **Target**: `public.profiles` table update security.
- **Execution**:
  Non-owner user attempts to elevate their own role:
  ```javascript
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'owner' })
    .eq('user_id', supabase.auth.getUser().id);
  ```
- **Expected Result**:
  - Rejected by RLS policy `profiles_update_policy` (which enforces `has_role('owner')`).
  - In addition, database trigger `trg_prevent_role_escalation` cancels the update and logs the unauthorized modification attempt to `audit_log`.

---

### Test 6: Immutable Data Integrity (Deleting Bills or Payments)
- **Target**: Core ledger immutability (`public.bills`, `public.payments`).
- **Execution**:
  ```javascript
  // Attempt to delete a bill
  const res1 = await supabase.from('bills').delete().eq('id', 'B001');

  // Attempt to delete a payment
  const res2 = await supabase.from('payments').delete().eq('id', 'P001');
  ```
- **Expected Result**:
  - Both queries return RLS errors or 0 rows affected.
  - No `DELETE` policy exists on `public.bills` or `public.payments` for any role.
  - Bills may only transition to `Cancelled` via `cancel_bill(id, reason)` RPC.
  - Payments may only be reversed via `reverse_payment(id, reason)` RPC.

---

### Test 7: PII Confidentiality (Reading Aadhaar/PAN as Non-Owner)
- **Target**: UIDAI & DPDP Data Minimization compliance.
- **Execution**:
  1. As `manager` or `billing_staff`:
     ```javascript
     const { data: idents } = await supabase.from('employee_identities').select('*');
     const { data: apps } = await supabase.from('employee_applications').select('aadhaar, pan, license_no');
     ```
- **Expected Result**:
  - `employee_identities`: Returns empty array (`[]`); RLS limits access to `has_role('owner')`.
  - `employee_applications`: Stored values are already masked at ingest (`XXXX XXXX 1234`, `AB*****4F`, `XXXX-XXXX-1234`). Plaintext 12-digit Aadhaar does not exist in the database.

---

### Test 8: Public Links & Malicious Payloads

#### 8.1 Public Bill Link (`#b=<payload>`)
- **Vectors**:
  - `#b=null`
  - `#b='><script>alert(1)</script>`
  - `#b=eyJpZCI6IjEyMyIsImludmFsaWQiOiJ5ZXMifQ==` (corrupted Base64 JSON)
- **Execution**: Navigate browser to `http://127.0.0.1:8788/#b='><script>alert(1)</script>`.
- **Expected Result**:
  - Base64 parser safely fails with `try/catch`.
  - Content-Security-Policy blocks execution of any inline script.
  - Display fallback: `"Invalid or expired bill link."`.

#### 8.2 Public Employee Joining Invite Link (`#join=<payload>`)
- **Vectors**:
  - Prototype pollution: `#join={"__proto__":{"isAdmin":true}}`
  - XSS payload in URL parameter: `#join=PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==`
- **Execution**: Navigate browser to `http://127.0.0.1:8788/#join=PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==`.
- **Expected Result**:
  - All decoded fields are sanitized with `esc()` (HTML entity encoding).
  - CSP rejects script execution.
  - Form validation blocks submission unless invite token exists in `public.employee_invites` with `status = 'open'`.

#### 8.3 Salary Slips API (`/api/slips?tok=<payload>`)
- **Vectors**:
  - SQL Injection: `GET /api/slips?tok=' OR '1'='1`
  - Path traversal: `GET /api/slips?tok=../../etc/passwd`
- **Execution**:
  ```bash
  curl -i "http://127.0.0.1:8788/api/slips?tok=' OR '1'='1"
  ```
- **Expected Result**:
  - Worker regex validation: `if (!/^[a-z0-9]{16,40}$/.test(t)) return J({ error: 'bad' }, 400);`
  - Immediately rejects with `HTTP 400 Bad Request` (`{"error":"bad"}`).

#### 8.4 Application Submission (`POST /api/apply`)
- **Vectors**:
  - Payload > 6 MB (HTTP 413)
  - Invalid Aadhaar checksum (Verhoeff failure)
  - Malformed base64 document upload
  - XSS injection in `name` or `address`
- **Execution**:
  ```bash
  curl -i -X POST http://127.0.0.1:8788/api/apply \
    -H "Content-Type: application/json" \
    -d '{"srjoin":1,"id":"J999","t":"open123","name":"<script>alert(1)</script>","mobile":"9876543210","address":"Test Rd","aadhaar":"111111111111"}'
  ```
- **Expected Result**:
  - Checksum validation rejects invalid Aadhaar with `HTTP 400 Bad Request`.
  - Payload > 6 MB rejected with `HTTP 413 Payload Too Large`.
  - Ingest logic masks Aadhaar to `XXXX XXXX 1111` and encodes text before insertion.
  - Document files are uploaded only if MIME type matches `image/jpeg`, `image/png`, `image/webp`, or `application/pdf`.

---

## 4. Automated Test Suite References

To execute the automated regression test suites verifying these rules:

```bash
# 1. Verify PII Masking, UIDAI Compliance & 30-Day Retention Trigger
node scratch/test_pii_masking_and_retention.mjs

# 2. Verify CSP Headers, Vendored Scripts, Library Upgrades & app.js
node scratch/test_vendor_csp_appjs.mjs
```

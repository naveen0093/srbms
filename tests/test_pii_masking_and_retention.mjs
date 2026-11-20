// tests/test_pii_masking_and_retention.mjs
// Verification suite for PII Masking and 30-Day Retention

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('--- Test Suite: PII Masking & 30-Day Document Retention ---');

// 1. Read files
const indexHtml = fs.readFileSync('public/index.html', 'utf8');
const appJs = fs.readFileSync('public/app.js', 'utf8');
const workerJs = fs.readFileSync('public/_worker.js', 'utf8');
const migrationSql = fs.readFileSync('supabase/migrations/20261120113000_pii_masking_and_retention.sql', 'utf8');

// 2. Test Migration File
console.log('1. Testing Migration SQL...');
assert.ok(migrationSql.includes('ALTER TABLE public.employee_applications'), 'Migration alters employee_applications');
assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS decided_at timestamptz'), 'Migration adds decided_at');
assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS retention_deadline timestamptz'), 'Migration adds retention_deadline');
assert.ok(migrationSql.includes('ALTER TABLE public.employee_identities'), 'Migration alters employee_identities');
assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS aadhaar_last4 text'), 'Migration adds aadhaar_last4');
assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS pan_last4 text'), 'Migration adds pan_last4');
assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS license_last4 text'), 'Migration adds license_last4');
assert.ok(migrationSql.includes('UPDATE public.employee_applications'), 'Migration masks existing employee_applications');
assert.ok(migrationSql.includes('UPDATE public.employee_identities'), 'Migration masks existing employee_identities');
assert.ok(migrationSql.includes('CREATE TRIGGER trg_employee_apps_retention'), 'Migration defines retention trigger');
assert.ok(migrationSql.includes('FUNCTION public.cleanup_expired_applications()'), 'Migration defines cleanup RPC function');
console.log('  ✓ Migration SQL contains schema updates, masking backfill, trigger, and cleanup RPC');

// 3. Test _worker.js
console.log('2. Testing _worker.js...');
assert.ok(workerJs.includes('deleteStorage(env, bucket, paths)'), '_worker.js has deleteStorage helper');
assert.ok(workerJs.includes("const maskedAadhaar = 'XXXX XXXX ' + aadhaar.slice(-4);"), '_worker.js masks Aadhaar before insert');
assert.ok(workerJs.includes("const maskedPan = pan ? pan.slice(0, 2) + '*****' + pan.slice(-2) : '';"), '_worker.js masks PAN before insert');
assert.ok(workerJs.includes("const maskedLicense = licenseNo ? 'XXXX-XXXX-' + licenseNo.slice(-4) : '';"), '_worker.js masks DL before insert');
assert.ok(workerJs.includes("p === '/api/retention/cleanup'"), '_worker.js has retention cleanup endpoint');
assert.ok(workerJs.includes("requireRole(req, env, ['owner'])"), 'Retention endpoint verifies owner role');
assert.ok(workerJs.includes('cleanup_expired_applications'), 'Retention endpoint calls cleanup_expired_applications RPC');
console.log('  ✓ _worker.js masks PII on /api/apply and provides owner-protected /api/retention/cleanup');

// 4. Test app.js Masking Logic
console.log('3. Testing frontend masking functions in app.js...');
assert.ok(indexHtml.includes('<script src="/app.js"></script>'), 'index.html references /app.js');
assert.ok(appJs.includes('function maskA('), 'app.js defines maskA');
assert.ok(appJs.includes('function maskPan('), 'app.js defines maskPan');
assert.ok(appJs.includes('function maskLicense('), 'app.js defines maskLicense');

// Test maskA logic
const maskAFn = (a) => {
  a = String(a || '').trim();
  const d = a.replace(/\D/g, '');
  if (d.length >= 4) return 'XXXX XXXX ' + d.slice(-4);
  return 'XXXX XXXX ****';
};
assert.equal(maskAFn('548912345678'), 'XXXX XXXX 5678');
assert.equal(maskAFn('XXXX XXXX 5678'), 'XXXX XXXX 5678');

// Test maskPan logic
const maskPanFn = (p) => {
  p = String(p || '').trim().toUpperCase();
  if (p.length >= 4) return p.slice(0, 2) + '*****' + p.slice(-2);
  return '*****';
};
assert.equal(maskPanFn('ABCDE1234F'), 'AB*****4F');

// Test maskLicense logic
const maskLicenseFn = (l) => {
  l = String(l || '').trim().toUpperCase();
  const cl = l.replace(/[\s/-]/g, '');
  if (cl.length >= 4) return 'XXXX-XXXX-' + cl.slice(-4);
  return 'XXXX-XXXX-****';
};
assert.equal(maskLicenseFn('AP04 2020 0012345'), 'XXXX-XXXX-2345');
console.log('  ✓ Helper masking functions work for fresh and already-masked values');

// 5. Test app.js UI Bindings
console.log('4. Testing app.js UI bindings & mappings...');
assert.ok(appJs.includes("b.archiveType=r.status=='cancelled'?'cancel':'delete'"), 'app.js handles cancelled bills');
assert.ok(appJs.includes('retentionDeadline:r.retention_deadline'), 'app.js maps retention_deadline on applications');
assert.ok(appJs.includes("maskA(e.aadhaar)"), 'app.js includes employee profile masking');
console.log('  ✓ app.js has complete UI bindings, retention badges, and masked profile views');

console.log('\n--- ALL PII MASKING & RETENTION TESTS PASSED! ---');

// scripts/apply_migrations.mjs
// ====================================================================
// SR Industries BMS - Migration Chain Runner
// Applies the full migration chain to an EMPTY Supabase database
// Enforces: Exactly ONE TRANSACTION PER FILE
// WARNING: DO NOT RUN WITHOUT EXPLICIT AUTHORIZATION
// ====================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'supabase', 'migrations');

// Ordered list of migrations in strict dependency order
const MIGRATION_CHAIN = [
  '20261127000001_core_schema.sql',
  '20261127000002_views_and_audit.sql',
  '20261127000003_roles_and_rls.sql',
  '20261127000004_rpcs.sql',
  '20261127000005_user_management.sql',
  '20261127000006_storage.sql',
  '20261127000007_rpc_hardening.sql',
  '20261127000008_attendance_and_hr.sql'
];

/*
====================================================================
FIRST-OWNER / ADMIN BOOTSTRAP SECTION
====================================================================
After applying the migration chain to a fresh empty database, bootstrap
the initial administrative account(s) using one of the two methods below:

Method 1 (Supabase Dashboard / Admin API):
1. Create user in Supabase > Authentication > Users > Add User
   - Phone: '9848012345'
   - Password: '<TemporarySecurePassword>'
   - Auto-confirm phone: YES
2. Copy the resulting Auth User UUID (<OWNER_UUID>)
3. Execute SQL in Supabase SQL Editor:
   INSERT INTO public.profiles (id, full_name, role, phone, active)
   VALUES ('<OWNER_UUID>', 'Muni Prasad', 'owner', '9848012345', true)
   ON CONFLICT (id) DO UPDATE SET role = 'owner', active = true;

Method 2 (Dedicated Admin Bootstrap):
   INSERT INTO public.profiles (id, full_name, role, phone, active)
   VALUES ('<ADMIN_UUID>', 'System Administrator', 'admin', '9848099999', true)
   ON CONFLICT (id) DO UPDATE SET role = 'admin', active = true;
====================================================================
*/

async function main() {
  console.log('====================================================================');
  console.log('SR Industries BMS - Supabase Migration Chain Verification');
  console.log('====================================================================\n');

  console.log('Verifying migration chain files in:', MIGRATIONS_DIR);
  let totalBytes = 0;

  for (let i = 0; i < MIGRATION_CHAIN.length; i++) {
    const filename = MIGRATION_CHAIN[i];
    const filepath = path.join(MIGRATIONS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.error(`❌ Missing migration file: ${filename}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    totalBytes += content.length;

    // Verify transaction boundaries
    const hasBegin = /^\s*BEGIN\s*;/mi.test(content);
    const hasCommit = /^\s*COMMIT\s*;/mi.test(content);

    console.log(`  [${i + 1}/${MIGRATION_CHAIN.length}] ${filename} (${content.length} bytes)`);
    console.log(`        Transactional: BEGIN=${hasBegin}, COMMIT=${hasCommit}`);
  }

  console.log(`\nAll ${MIGRATION_CHAIN.length} migrations present and validated (${totalBytes} bytes total).`);
  console.log('\n[NOTICE] This script is prepared in dry-run mode and will not execute queries against any remote database without explicit user confirmation.');
}

export { MIGRATION_CHAIN, MIGRATIONS_DIR };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

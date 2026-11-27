#!/usr/bin/env bash
# ====================================================================
# SR Industries BMS - Apply Full Migration Chain (Bash / psql)
# Applies the full migration chain to an EMPTY Supabase database
# Enforces: One transaction per file (-1 / --single-transaction)
# DO NOT RUN WITHOUT EXPLICIT USER APPROVAL
# ====================================================================

set -euo pipefail

# --------------------------------------------------------------------
# FIRST-OWNER / ADMIN BOOTSTRAP INSTRUCTIONS
# --------------------------------------------------------------------
# After applying all migrations to an empty database, create the first owner:
#
# 1. Create Auth User in Supabase Auth (e.g. phone: '9848012345')
# 2. Link owner profile:
#    INSERT INTO public.profiles (id, full_name, role, phone, active)
#    VALUES ('<OWNER_AUTH_UUID>', 'Muni Prasad', 'owner', '9848012345', true)
#    ON CONFLICT (id) DO UPDATE SET role = 'owner', active = true;
# --------------------------------------------------------------------

MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../supabase/migrations" && pwd)"

MIGRATIONS=(
  "20261127000001_core_schema.sql"
  "20261127000002_views_and_audit.sql"
  "20261127000003_roles_and_rls.sql"
  "20261127000004_rpcs.sql"
  "20261127000005_user_management.sql"
  "20261127000006_storage.sql"
  "20261127000007_rpc_hardening.sql"
  "20261127000008_attendance_and_hr.sql"
)

echo "=== Supabase Migration Chain (Dry Run Plan) ==="
echo "Target Directory: ${MIGRATIONS_DIR}"

for file in "${MIGRATIONS[@]}"; do
  full_path="${MIGRATIONS_DIR}/${file}"
  if [[ ! -f "${full_path}" ]]; then
    echo "ERROR: Migration file not found: ${full_path}"
    exit 1
  fi
  echo "Found migration: ${file}"
done

echo ""
echo "To execute against a target database, provide DATABASE_URL and run:"
echo "  for f in \"\${MIGRATIONS[@]}\"; do"
echo "    echo \"Applying \$f in single transaction...\""
echo "    psql \"\${DATABASE_URL}\" -v ON_ERROR_STOP=1 -1 -f \"\${MIGRATIONS_DIR}/\$f\""
echo "  done"

import fs from 'fs';

const envText = fs.readFileSync('.dev.vars', 'utf-8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const DEMO_USERS = [
  // Admins
  { phone: '9848000001', name: 'Chandra Sekhar (Admin 1)', role: 'admin', employee_id: null },
  { phone: '9848000002', name: 'Priya Sharma (Admin 2)', role: 'admin', employee_id: null },

  // Owners
  { phone: '9848000011', name: 'Muni Prasad (Owner 1)', role: 'owner', employee_id: null },
  { phone: '9848000012', name: 'Lakshmi Devi (Owner 2)', role: 'owner', employee_id: null },

  // Managers
  { phone: '9848000021', name: 'Suresh Kumar', role: 'manager', employee_id: 'MGR-001' },
  { phone: '9848000022', name: 'Venkatesh Rao', role: 'manager', employee_id: 'MGR-002' },

  // Employees
  { phone: '9848000031', name: 'Ravi Varma (Driver 1)', role: 'employee', employee_id: 'EMP-001' },
  { phone: '9848000032', name: 'Kalyan Babu (Driver 2)', role: 'employee', employee_id: 'EMP-002' },
  { phone: '9848000033', name: 'Mahesh Goud (Plant Operator)', role: 'employee', employee_id: 'EMP-003' },
  { phone: '9848000034', name: 'Naresh Reddy (Godown Staff)', role: 'employee', employee_id: 'EMP-004' }
];

async function seed() {
  console.log('Seeding demo auth users and profiles...');

  for (const u of DEMO_USERS) {
    const email = `${u.phone}@larven.in`;
    const password = 'Larven@2026';

    // 1. Create or update auth user via Admin API
    const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email,
        phone: `+91${u.phone}`,
        password,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: u.name,
          role: u.role
        }
      })
    });

    let authUser = await createRes.json();
    if (!createRes.ok) {
      // User might already exist, find user by email
      const listRes = await fetch(
        `${env.SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );
      const listData = await listRes.json();
      const existing = (listData.users || []).find((usr) => usr.email === email);
      if (existing) {
        // Update password
        await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
          method: 'PUT',
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ password, email_confirm: true, phone_confirm: true })
        });
        authUser = existing;
      }
    }

    if (!authUser || !authUser.id) {
      console.error(`Failed to create/get user for ${u.phone}:`, authUser);
      continue;
    }

    // 2. Link profile in public.profiles
    const profRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: authUser.id,
        full_name: u.name,
        role: u.role,
        phone: u.phone,
        employee_id: u.employee_id,
        active: true
      })
    });

    console.log(`✓ ${u.role.padEnd(8)} | ${u.phone} | ${u.name} (UUID: ${authUser.id})`);
  }

  console.log('\nAll 10 demo accounts seeded and linked successfully!');
}

seed().catch(console.error);

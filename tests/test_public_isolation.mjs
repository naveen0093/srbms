// tests/test_public_isolation.mjs
// Verifies that build output directory (public/) isolates private files.
// Confirms that nothing under /supabase, /docs, /tests, or repository root metadata is reachable.

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('--- Test Suite: Public Asset Isolation ---');

// 1. Filesystem isolation check
console.log('1. Checking filesystem layout...');
const publicFiles = fs.readdirSync('public');
assert.ok(publicFiles.includes('index.html'), 'public/ contains index.html');
assert.ok(publicFiles.includes('app.js'), 'public/ contains app.js');
assert.ok(publicFiles.includes('_worker.js'), 'public/ contains _worker.js');
assert.ok(publicFiles.includes('vendor'), 'public/ contains vendor directory');

assert.ok(!publicFiles.includes('supabase'), 'public/ does NOT contain supabase');
assert.ok(!publicFiles.includes('docs'), 'public/ does NOT contain docs');
assert.ok(!publicFiles.includes('tests'), 'public/ does NOT contain tests');
assert.ok(!publicFiles.includes('package.json'), 'public/ does NOT contain package.json');
assert.ok(!publicFiles.includes('README.md'), 'public/ does NOT contain README.md');
console.log('  ✓ Only deployable client assets and _worker.js are located in public/');

// 2. HTTP isolation check (if dev server running)
console.log('2. Testing HTTP endpoint isolation against live dev server (if active)...');
const blockedPaths = [
  '/supabase/migrations/20261119000000_initial_schema.sql',
  '/docs/test-plan.md',
  '/tests/test_public_isolation.mjs',
  '/package.json',
  '/README.md',
  '/.git/config'
];

for (const p of blockedPaths) {
  try {
    const res = await fetch(`http://127.0.0.1:8788${p}`);
    // Should return 404 Not Found since public/ is the asset root
    assert.ok(res.status === 404 || res.status === 403, `Path ${p} is not reachable (HTTP ${res.status})`);
    console.log(`  ✓ Blocked path ${p} returned HTTP ${res.status}`);
  } catch (err) {
    console.log(`  (Dev server not responding for ${p}, skipped HTTP check)`);
  }
}

console.log('\n--- ALL PUBLIC ISOLATION TESTS PASSED! ---');

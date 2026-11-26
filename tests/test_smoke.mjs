// tests/test_smoke.mjs
// Smoke test suite verifying:
// 1. app.js parses cleanly and executes
// 2. Every page route in NAV exists in PAGES as an executable function
// 3. Page renderers execute without throwing errors
// 4. Vendor files and README.md exist with proper versions
// 5. Assets (images) exist as standalone files
// 6. index.html is free of browser-saved artifacts and base64 strings

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('--- Smoke Test: Larven BMS Architecture & Route Integrity ---');

// 1. Verify app.js syntax and parseability
console.log('1. Checking app.js syntax and parseability...');
assert.ok(fs.existsSync('public/app.js'), 'public/app.js must exist');
const appCode = fs.readFileSync('public/app.js', 'utf8');
assert.ok(appCode.length > 50000, `app.js has substantial content (${appCode.length} bytes)`);

// Ensure syntax parses without error
new Function(appCode);
console.log(`  ✓ app.js parsed with zero syntax errors (${appCode.length} bytes)`);

// 2. Execute app.js in mock environment
console.log('2. Executing app.js in mock environment...');
const mockDoc = {
  title: '',
  head: { appendChild: () => {} },
  body: { classList: { add: () => {}, remove: () => {} } },
  querySelector: () => ({
    innerHTML: '',
    textContent: '',
    classList: { add: () => {}, remove: () => {} },
    style: {},
    setAttribute: () => {},
    removeAttribute: () => {}
  }),
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({
    setAttribute: () => {},
    appendChild: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} }
  }),
  addEventListener: () => {}
};

const mockWindow = {
  location: {
    href: 'http://127.0.0.1:8788/#dashboard',
    hash: '#dashboard',
    search: '',
    pathname: '/'
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  addEventListener: () => {},
  document: mockDoc,
  navigator: { userAgent: 'smoke-test-agent' },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {}
};
mockWindow.window = mockWindow;
mockWindow.self = mockWindow;
mockWindow.global = mockWindow;
mockWindow.document.defaultView = mockWindow;

const context = vm.createContext(mockWindow);
vm.runInContext(appCode, context);
console.log('  ✓ app.js runtime initialization succeeded');

// 3. Verify NAV and PAGES route completeness
console.log('3. Validating NAV routes against PAGES registry...');
const nav = context.window.NAV;
const pages = context.window.PAGES;

assert.ok(Array.isArray(nav), 'NAV must be an array');
assert.ok(typeof pages === 'object' && pages !== null, 'PAGES must be an object');

const allNavRoutes = [];
nav.forEach(group => {
  assert.ok(Array.isArray(group) && group.length >= 2, 'Each NAV item must have [groupName, items]');
  const items = group[1];
  assert.ok(Array.isArray(items), 'Group items must be an array');
  items.forEach(item => {
    assert.ok(Array.isArray(item) && item.length >= 3, 'Each route item must have [id, label, icon]');
    const [routeId, label, icon] = item;
    allNavRoutes.push({ routeId, label, icon, group: group[0] || 'Top' });
  });
});

console.log(`  Found ${allNavRoutes.length} routes across ${nav.length} navigation groups in NAV`);
assert.ok(allNavRoutes.length >= 30, `Expected at least 30 routes in NAV, found ${allNavRoutes.length}`);

// Verify every route exists in PAGES
const missingRoutes = [];
allNavRoutes.forEach(({ routeId, label, group }) => {
  const handler = pages[routeId];
  if (typeof handler !== 'function') {
    missingRoutes.push({ routeId, label, group });
  } else {
    // Test that the page generator executes and returns HTML
    try {
      const html = handler();
      assert.ok(typeof html === 'string', `Page ${routeId} must return an HTML string`);
    } catch (err) {
      assert.fail(`Error executing page handler for route "${routeId}": ${err.message}`);
    }
  }
});

assert.strictEqual(
  missingRoutes.length,
  0,
  `The following NAV routes are missing page handlers in PAGES: ${JSON.stringify(missingRoutes)}`
);
console.log(`  ✓ All ${allNavRoutes.length} NAV routes exist in PAGES and render valid HTML without errors`);

// 4. Verify Vendor Files and README
console.log('4. Verifying vendor libraries and licenses...');
const vendorFiles = [
  { name: 'html2canvas.min.js', minSize: 100000 },
  { name: 'jspdf.umd.min.js', minSize: 300000 },
  { name: 'xlsx.full.min.js', minSize: 800000 },
  { name: 'qrcode.min.js', minSize: 15000 }
];

for (const v of vendorFiles) {
  const vPath = path.join('public/vendor', v.name);
  assert.ok(fs.existsSync(vPath), `Vendor file ${vPath} must exist`);
  const sz = fs.statSync(vPath).size;
  assert.ok(sz >= v.minSize, `Vendor file ${vPath} size (${sz}) must be >= ${v.minSize}`);
  console.log(`  ✓ ${v.name} (${sz} bytes)`);
}

assert.ok(fs.existsSync('public/vendor/README.md'), 'public/vendor/README.md must exist');
const vendorReadme = fs.readFileSync('public/vendor/README.md', 'utf8');
assert.ok(vendorReadme.includes('html2canvas'), 'README mentions html2canvas');
assert.ok(vendorReadme.includes('4.2.1'), 'README documents upgraded jsPDF 4.2.1');
assert.ok(vendorReadme.includes('0.20.3'), 'README documents upgraded SheetJS 0.20.3');
assert.ok(vendorReadme.includes('QRCode.js'), 'README documents QRCode.js');
console.log('  ✓ public/vendor/README.md documents all 4 libraries with versions and licenses');

// 5. Verify Assets
console.log('5. Verifying standalone assets...');
const heroPath = 'public/assets/hero.jpg';
const wmPath = 'public/assets/watermark.png';

assert.ok(fs.existsSync(heroPath), `${heroPath} must exist`);
assert.ok(fs.existsSync(wmPath), `${wmPath} must exist`);

const heroBuf = fs.readFileSync(heroPath);
const wmBuf = fs.readFileSync(wmPath);

// JPEG magic bytes 0xFF 0xD8 0xFF
assert.ok(heroBuf[0] === 0xff && heroBuf[1] === 0xd8 && heroBuf[2] === 0xff, 'hero.jpg must be a valid JPEG');
// PNG magic bytes 0x89 0x50 0x4E 0x47
assert.ok(wmBuf[0] === 0x89 && wmBuf[1] === 0x50 && wmBuf[2] === 0x4e && wmBuf[3] === 0x47, 'watermark.png must be a valid PNG');
console.log(`  ✓ Assets verified: hero.jpg (${heroBuf.length} bytes), watermark.png (${wmBuf.length} bytes)`);

// 6. Verify index.html clean state
console.log('6. Verifying public/index.html clean state...');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

assert.ok(!indexHtml.includes('saved from url'), 'index.html must not contain saved-from comment');
assert.ok(!indexHtml.includes('data:image/'), 'index.html must not contain inline base64 images');
assert.ok(!indexHtml.includes('Weekly Sales Trend'), 'index.html must not contain rendered chart titles');
assert.ok(!indexHtml.includes('Payment Methods'), 'index.html must not contain rendered chart titles');
assert.ok(!indexHtml.includes('Top Customers'), 'index.html must not contain rendered chart titles');
assert.ok(!indexHtml.includes('hidden=""'), 'index.html must not contain hidden="" artifacts');
assert.ok(!indexHtml.includes('https://cdnjs.cloudflare.com'), 'index.html must not load scripts from cdnjs');
assert.ok(!indexHtml.includes('https://cdn.jsdelivr.net'), 'index.html must not load scripts from jsdelivr');
assert.ok(indexHtml.includes('<nav class="nav" id="nav"></nav>'), 'index.html has clean empty #nav');
assert.ok(indexHtml.includes('<main class="content" id="view"></main>'), 'index.html has clean empty #view');
assert.ok(indexHtml.includes('<nav class="tabbar" id="tabbar" aria-label="Quick navigation"></nav>'), 'index.html has clean empty #tabbar');
assert.ok(indexHtml.includes('<script src="/app.js"></script>'), 'index.html loads /app.js');
assert.ok(indexHtml.includes('<script src="/vendor/html2canvas.min.js"></script>'), 'index.html loads vendored html2canvas');
assert.ok(indexHtml.includes('<script src="/vendor/jspdf.umd.min.js"></script>'), 'index.html loads vendored jspdf');
assert.ok(indexHtml.includes('<script src="/vendor/xlsx.full.min.js"></script>'), 'index.html loads vendored xlsx');
assert.ok(indexHtml.includes('<script src="/vendor/qrcode.min.js"></script>'), 'index.html loads vendored qrcode');
console.log('  ✓ public/index.html is clean, standalone, and references local assets');

console.log('\n--- ALL SMOKE TESTS PASSED SUCCESSFULLY! ---');

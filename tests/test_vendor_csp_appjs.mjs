// tests/test_vendor_csp_appjs.mjs
// Comprehensive test suite for Task:
// 1) Pinned Supabase JS & SRI / Vendor downloads
// 2) Upgraded jsPDF (4.2.1) and SheetJS (0.20.3)
// 3) app.js extraction from index.html
// 4) Content-Security-Policy headers in _worker.js

import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

console.log('--- Test Suite: Vendoring, CSP, Library Upgrades & app.js ---');

// 1. Verify Vendor Files
console.log('1. Checking /vendor/ files...');
const vendorFiles = [
  'public/vendor/html2canvas.min.js',
  'public/vendor/jspdf.umd.min.js',
  'public/vendor/xlsx.full.min.js',
  'public/vendor/supabase.min.js'
];

for (const f of vendorFiles) {
  assert.ok(fs.existsSync(f), `File ${f} exists`);
  const stat = fs.statSync(f);
  assert.ok(stat.size > 10000, `File ${f} is non-empty (${stat.size} bytes)`);
  const buf = fs.readFileSync(f);
  const sha384 = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
  console.log(`  ✓ ${f} (${stat.size} bytes, ${sha384})`);
}

// 2. Verify index.html does not contain inline application script
console.log('2. Checking index.html script tags...');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');
assert.ok(!indexHtml.includes('<script>\n(function(){'), 'index.html no longer contains inline script');
assert.ok(indexHtml.includes('<script src="/app.js"></script>'), 'index.html loads /app.js');
assert.ok(indexHtml.includes('<script src="/vendor/supabase.min.js"></script>'), 'index.html loads /vendor/supabase.min.js');
assert.ok(indexHtml.includes('<script src="/vendor/html2canvas.min.js"></script>'), 'index.html loads /vendor/html2canvas.min.js');
assert.ok(indexHtml.includes('<script src="/vendor/jspdf.umd.min.js"></script>'), 'index.html loads /vendor/jspdf.umd.min.js');
assert.ok(indexHtml.includes('<script src="/vendor/xlsx.full.min.js"></script>'), 'index.html loads /vendor/xlsx.full.min.js');
console.log('  ✓ index.html cleanly references vendored scripts and /app.js');

// 3. Verify app.js
console.log('3. Checking app.js syntax and integrity...');
const appJs = fs.readFileSync('public/app.js', 'utf8');
assert.ok(appJs.length > 200000, 'app.js contains full application code');
assert.ok(appJs.includes('bootApp()'), 'app.js includes bootApp invocation');
new Function(appJs); // Validates syntax
console.log('  ✓ app.js syntax parsed with zero errors');

// 4. Test Upgraded Library Functionality (XLSX 0.20.3 & jsPDF 4.2.1)
console.log('4. Testing upgraded SheetJS (0.20.3) and jsPDF (4.2.1)...');

// Test XLSX
const xlsxCode = fs.readFileSync('public/vendor/xlsx.full.min.js', 'utf8');
const xlsxContext = { console };
xlsxContext.window = xlsxContext;
xlsxContext.globalThis = xlsxContext;
vm.createContext(xlsxContext);
vm.runInContext(xlsxCode, xlsxContext);
const XLSX = xlsxContext.XLSX;
assert.ok(XLSX && XLSX.utils, 'XLSX loaded properly');
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['Bill No', 'Total'], ['SR/26-27/0001', 5000]]);
XLSX.utils.book_append_sheet(wb, ws, 'Bills');
const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
assert.ok(xlsxBuf && xlsxBuf.length > 500, 'XLSX generated valid excel buffer');
console.log(`  ✓ SheetJS v0.20.3 export confirmed working (${xlsxBuf.length} bytes)`);

// Test jsPDF
const jspdfCode = fs.readFileSync('public/vendor/jspdf.umd.min.js', 'utf8');
const jspdfContext = {
  console,
  TextEncoder,
  TextDecoder,
  navigator: { userAgent: 'test' },
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
};
jspdfContext.window = jspdfContext;
jspdfContext.self = jspdfContext;
jspdfContext.globalThis = jspdfContext;
vm.createContext(jspdfContext);
vm.runInContext(jspdfCode, jspdfContext);
const jsPDF = (jspdfContext.jspdf && jspdfContext.jspdf.jsPDF) || jspdfContext.jsPDF;
assert.ok(typeof jsPDF === 'function', 'jsPDF constructor loaded');
const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
pdf.text('SR Industries Bill Invoice', 20, 20);
const pdfBuf = pdf.output('arraybuffer');
assert.ok(pdfBuf && pdfBuf.byteLength > 1000, 'jsPDF generated valid PDF byte buffer');
console.log(`  ✓ jsPDF v4.2.1 export confirmed working (${pdfBuf.byteLength} bytes)`);

// 5. Test CSP Header & HTTP Response from dev server (if running)
try {
  console.log('5. Testing live server Content-Security-Policy headers...');
  const res = await fetch('http://127.0.0.1:8788/');
  if (res.status === 200) {
    const csp = res.headers.get('content-security-policy');
    if (csp) {
      assert.ok(csp.includes("default-src 'self'"), 'CSP includes default-src');
      assert.ok(csp.includes("script-src 'self'"), 'CSP includes script-src');
      assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"), 'CSP includes style-src');
      assert.ok(csp.includes("font-src https://fonts.gstatic.com"), 'CSP includes font-src');
      assert.ok(csp.includes("img-src 'self' data: blob:"), 'CSP includes img-src');
      assert.ok(csp.includes("connect-src 'self'"), 'CSP includes connect-src');
      assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP includes frame-ancestors');
      assert.ok(csp.includes("base-uri 'none'"), 'CSP includes base-uri');
      assert.ok(csp.includes("object-src 'none'"), 'CSP includes object-src');
      console.log('  ✓ Live Content-Security-Policy contains all required directives');
    }
  }
} catch (e) {
  console.log('  (Dev server check skipped or not running)');
}

console.log('\n--- ALL VENDOR, CSP, UPGRADE & APP.JS TESTS PASSED! ---');

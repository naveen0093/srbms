# Vendored Third-Party Frontend Libraries

To maintain a strict Content-Security-Policy (CSP) with `script-src 'self'`, eliminate external CDN dependencies, and guarantee deterministic offline operation, all third-party libraries are vendored locally in this directory.

| Library | Version | File | License | Source / Upstream Distribution URL |
| :--- | :--- | :--- | :--- | :--- |
| **@supabase/supabase-js** | 2.119.2 | `supabase.min.js` | MIT | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/dist/umd/supabase.js` |
| **html2canvas** | 1.4.1 | `html2canvas.min.js` | MIT | `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js` |
| **jsPDF** | 4.2.1 | `jspdf.umd.min.js` | MIT | `https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js` |
| **SheetJS (xlsx)** | 0.20.3 | `xlsx.full.min.js` | Apache-2.0 | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` |

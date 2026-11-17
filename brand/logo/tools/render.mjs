import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs';
const [,, file, png, scale='1'] = process.argv;
const s = fs.readFileSync(file,'utf8'); const m = s.match(/width="(\d+)" height="(\d+)"/);
const ff = fs.readFileSync(new URL('./fonts/jost500.ttf', import.meta.url)).toString('base64');
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:+m[1],height:+m[2]}, deviceScaleFactor:+scale});
await p.setContent(`<html><head><style>@font-face{font-family:Jost;src:url(data:font/ttf;base64,${ff})}html,body{margin:0;background:transparent}</style></head><body>${s}</body></html>`);
await p.waitForTimeout(400); await p.screenshot({path:png, omitBackground:true}); await b.close();

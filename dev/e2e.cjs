// End-to-end check: real page in Chromium + apps-script/Code.gs running on the
// in-memory fake. Players are invented test data.
// Run: NODE_PATH=$(npm root -g) LIBDIR=<folder with jspdf + jspdf-autotable node_modules> node dev/e2e.cjs [shots-dir]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { load } = require('./gas-mock.cjs');
const ROOT = path.join(__dirname, '..'), SHOTS = process.argv[2] || '/tmp/tt-shots';
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const head = ['AdmissionNumber', 'PlayerName', 'Sport', 'Group', 'Gender', 'DateOfBirth', 'PhotoUrl', 'Active', 'ParentPhone', 'MedicalNotes'];
const rows = [head];
['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].forEach((n, i) =>
  rows.push(['T' + (100 + i), 'Test ' + n, 'Football', 'GROUP ' + (1 + i % 2), i % 2 ? 'Female' : 'Male', new Date(Date.UTC(2012 + i % 5, i, 10)), 'x', i === 7 ? false : true, '000', 'none']));
rows.push(['T900', 'Test Cricket', 'Cricket', 'C', 'Male', '14/03/2015', '', 'TRUE', '', '']);
const gas = load({ sourceRows: rows });
gas.ctx.setup();
const KEY = gas.props.KEY;
const call = p => JSON.parse(gas.ctx.handle_(p).text);

// ---- backend checks ----
ok(call({ action: 'all', key: 'wrong' }).error === 'bad_key', 'wrong key is refused');
const all0 = call({ action: 'all', key: KEY }).data;
ok(all0.players.length === 8, 'reads 8 football players, skips cricket (got ' + all0.players.length + ')');
ok(all0.players.every(p => !('ParentPhone' in p) && !('parentphone' in p) && !('MedicalNotes' in p) && !('PhotoUrl' in p)), 'no contact, medical or photo fields leave the sheet');
ok(all0.players.find(p => p.id === 'a-T107').active === false, 'inactive player marked inactive');
ok(all0.players[0].dob === '2012-01-10', 'date of birth comes back as yyyy-mm-dd');

// ---- serve the app ----
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const BASE = 'http://127.0.0.1:' + server.address().port + '/';
const API = 'https://script.google.com/macros/s/TEST/exec';
const LIBDIR = process.env.LIBDIR;
const LIBS = { 'jspdf.umd.min.js': 'jspdf/dist/jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js': 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js' };

(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  let calls = 0, netDown = false;
  await ctx.route('https://script.google.com/**', async r => {
    if (netDown) return r.abort('internetdisconnected');
    calls++;
    const req = r.request(), u = new URL(req.url());
    const out = req.method() === 'POST' ? gas.ctx.doPost({ postData: { contents: req.postData() } }) : gas.ctx.doGet({ parameter: Object.fromEntries(u.searchParams) });
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: out.text });
  });
  await ctx.route('https://cdn.jsdelivr.net/**', r => { const f = Object.keys(LIBS).find(k => r.request().url().endsWith(k)); r.fulfill({ path: path.join(LIBDIR, 'node_modules', LIBS[f]), contentType: 'application/javascript' }); });
  await ctx.route('https://fonts.**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const shot = n => pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true });
  const wait = ms => pg.waitForTimeout(ms);

  await pg.goto(BASE); await wait(500); await shot('1-connect');
  ok(await pg.isVisible('#c-api'), 'first open shows the connect screen');
  await pg.fill('#c-api', API); await pg.fill('#c-key', 'nope'); await pg.click('[data-act=connect]'); await wait(400);
  ok((await pg.textContent('#view')).includes("key doesn't match"), 'wrong key explains the problem');
  await pg.fill('#c-key', KEY); await pg.click('[data-act=connect]'); await wait(800);
  ok(await pg.isVisible('.greet') && !(await pg.isVisible('#c-api')), 'connects and opens Home');
  await shot('2-home');

  await pg.click('nav [data-tab=points]'); await wait(200);
  await pg.click('[data-set=grp][data-val="GROUP 2"]'); await wait(100);
  ok((await pg.$$('tbody tr')).length === 3, 'group picker shows only that group\'s active players');
  await pg.click('[data-dom=Flexibility]'); await pg.click('[data-dom=Special]');
  await pg.fill('[data-spname]', 'Weak foot passes'); await pg.press('[data-spname]', 'Tab'); await wait(400);
  const n = (await pg.$$('input[data-cell]')).length;
  for (let i = 0; i < n; i++) { const c = (await pg.$$('input[data-cell]'))[i]; await c.fill(String((i * 7) % 33)); }
  await pg.click('[data-act=save]'); await wait(1500); await shot('3-points');
  const today = await pg.evaluate(() => TODAY);
  const data = gas.books[gas.props.DATA_SHEET_ID];
  const dayRow = data.getSheetByName('Days').rows.find(r => String(r[0]).replace("'", '') === today);
  ok(!!dayRow && JSON.parse(dayRow[1]).marks.Flexibility, 'day saved in the Days tab');
  ok(data.getSheetByName('Points').rows.length > 10, 'readable Points tab filled (' + (data.getSheetByName('Points').rows.length - 1) + ' rows)');
  ok((await pg.textContent('#savestate')).includes('All changes saved'), 'status says all saved');

  // offline: keep on device, send when back
  netDown = true; await pg.evaluate(() => dispatchEvent(new Event('offline')));
  const c0 = (await pg.$$('input[data-cell]'))[0]; await c0.fill('5'); await wait(1600);
  ok((await pg.textContent('#savestate')).includes('Offline'), 'offline change is kept on the phone');
  netDown = false; await pg.evaluate(() => dispatchEvent(new Event('online'))); await wait(1200);
  ok((await pg.textContent('#savestate')).includes('All changes saved'), 'offline change sent when back online');

  await pg.click('nav [data-tab=rank]'); await wait(300); await shot('4-rank');
  await pg.click('.pod.first'); await wait(300);
  await pg.fill('#note', 'Strong week.'); await pg.press('#note', 'Tab'); await wait(800);
  ok(data.getSheetByName('Notes').rows.length === 2, 'coach note saved');
  await shot('5-report');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }), pg.click('[data-pdf=card]')]);
  const pdfPath = path.join(SHOTS, 'card.pdf'); await dl.saveAs(pdfPath);
  ok(fs.statSync(pdfPath).size > 20000, 'report card PDF downloads (' + dl.suggestedFilename() + ')');
  await pg.click('[data-act=back]'); await pg.click('nav [data-tab=downloads]'); await wait(200);
  for (const k of ['overall', 'age', 'domains', 'days']) {
    const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }), pg.click(`[data-pdf=${k}]`)]);
    await d.saveAs(path.join(SHOTS, k + '.pdf')); ok(true, k + ' PDF downloads');
  }
  await shot('6-downloads');

  // hide a player, add one by hand, then reload: everything comes back from the sheet
  await pg.click('nav [data-tab=setup]'); await pg.click('[data-set=setMode][data-val=players]'); await wait(200);
  await pg.click('[data-hide="a-T100"]'); await pg.fill('#np-name', 'Test Manual'); await pg.fill('#np-group', 'GROUP 1'); await pg.click('[data-act=addplayer]'); await wait(1000);
  await shot('7-players');
  await pg.reload(); await wait(1200);
  const after = await pg.evaluate(() => ({ n: active().length, hidden: PLAYERS.find(p => p.id === 'a-T100').hidden, manual: PLAYERS.some(p => p.name === 'Test Manual'), days: Object.keys(DAYS).length }));
  ok(after.hidden === true && after.manual && after.n === 7 && after.days >= 1, 'after reload: hidden player, manual player and points all kept ' + JSON.stringify(after));
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  console.log('script calls:', calls);
  await br.close(); server.close();
  console.log(fails ? fails + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

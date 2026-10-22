// End-to-end check: real page in Chromium + apps-script/Code.gs running on the
// in-memory fake. Players are invented test data.
// Run: NODE_PATH=$(npm root -g) LIBDIR=<folder with jspdf + jspdf-autotable node_modules> node dev/e2e.cjs [shots-dir]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { load } = require('./gas-mock.cjs');
const ROOT = path.join(__dirname, '..'), SHOTS = process.argv[2] || '/tmp/tt-shots';
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const CFG_ORDER = m => ['Daily', 'Juggling', 'Flexibility', 'Core', 'Crossbar', 'Foot tennis', 'Special'].filter(d => m.includes(d)).join();
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

// ---- installed app updates: own files come fresh from the network, never stale from the HTTP cache ----
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(/cache: "reload"/.test(swSrc) && /fetch\(req, \{ cache: "no-cache" \}\)/.test(swSrc), 'service worker fetches the app fresh so updates show on the next open');

// Chrome resolves the manifest id against the site's origin, not the manifest's folder: "./" would make the id the whole
// sivavis11-sketch.github.io site, the same id as the MMS ASEP app there, and Chrome would treat the two as one app.
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
ok(new URL(man.id, 'https://sivavis11-sketch.github.io/').pathname === '/talent-tracker/' && new URL(man.scope, 'https://sivavis11-sketch.github.io/talent-tracker/manifest.webmanifest').pathname === '/talent-tracker/', 'app id and scope are Talent Tracker\'s own, separate from other apps on the same site');

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
  ok(await pg.isVisible('.me') && !(await pg.isVisible('#c-api')), 'connects and opens Home');
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
  ok(await pg.isVisible('#done.ok .mark') && (await pg.textContent('#done')).includes('Points saved') && (await pg.textContent('[data-act=save]')).includes('Saved'), 'Save day shows a big "Points saved" tick and the button says Saved');
  await (await pg.$$('input[data-cell]'))[1].fill('3'); ok((await pg.textContent('[data-act=save]')).trim() === 'Save day', 'changing a score turns the button back to Save day');

  // offline: keep on device, send when back
  netDown = true; await pg.evaluate(() => dispatchEvent(new Event('offline')));
  const c0 = (await pg.$$('input[data-cell]'))[0]; await c0.fill('5'); await wait(1600);
  await pg.click('[data-act=save]'); await wait(600);
  ok(await pg.isVisible('#done.wait') && (await pg.textContent('#done')).includes('Saved on this phone'), 'Save day offline says it is kept on the phone');
  ok((await pg.textContent('#savestate')).includes('Offline'), 'offline change is kept on the phone');
  netDown = false; await pg.evaluate(() => dispatchEvent(new Event('online'))); await wait(1200);
  ok((await pg.textContent('#savestate')).includes('All changes saved'), 'offline change sent when back online');

  // Mark Points opens clean: back on a date with points it shows those domains; an empty date shows an empty Daily sheet
  await pg.click('nav [data-tab=home]'); await wait(200); await pg.click('[data-go=points]'); await wait(300);
  const back = await pg.evaluate(() => ({ doms: S.doms, marked: markedOn(TODAY), filled: [...document.querySelectorAll('input[data-cell]')].filter(i => i.value).length }));
  ok(back.doms.join() === CFG_ORDER(back.marked) && back.filled > 0, 'reopening Mark Points shows the saved domains for today ' + JSON.stringify(back));
  await pg.evaluate(() => { window.__picked = 0; HTMLInputElement.prototype.showPicker = function () { window.__picked++; }; });
  await pg.click('#date'); ok(await pg.evaluate(() => window.__picked > 0), 'tapping the date opens the calendar');
  const past = await pg.evaluate(() => addDays(TODAY, -3));
  await pg.fill('#date', past); await pg.dispatchEvent('#date', 'change'); await wait(300);
  const empty = await pg.evaluate(() => ({ date: S.date, doms: S.doms, filled: [...document.querySelectorAll('input[data-cell]')].filter(i => i.value).length }));
  ok(empty.date === past && empty.doms.join() === 'Daily' && empty.filled === 0, 'a date with no points opens as an empty Daily sheet ' + JSON.stringify(empty));
  await pg.click('nav [data-tab=rank]'); await wait(300); await shot('4-rank');
  await pg.click('.pod.first'); await wait(300);
  await pg.fill('#note', 'Strong week.'); await pg.press('#note', 'Tab'); await wait(800);
  ok(data.getSheetByName('Notes').rows.length === 2, 'coach note saved');
  await shot('5-report');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }), pg.click('[data-pdf=card]')]);
  const pdfPath = path.join(SHOTS, 'card.pdf'); await dl.saveAs(pdfPath);
  ok(fs.statSync(pdfPath).size > 20000, 'report card PDF downloads (' + dl.suggestedFilename() + ')');
  await pg.click('[data-act=back]'); await pg.click('nav [data-tab=downloads]'); await wait(200);
  for (const k of ['overall', 'domains', 'days']) {
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
  await pg.click('nav [data-tab=home]'); await wait(300); await shot('8-home-week');
  ok(await pg.isVisible('nav.tabs [data-tab=rank]') && await pg.isVisible('.hello .rbtn') && await pg.isVisible('.vhero .go[data-go=points]'), 'Home shows the bottom bar, the round menu button and the Open Mark Points button');
  ok(await pg.isVisible('.vhero > img') && await pg.isVisible('.pair .mk') && await pg.isVisible('.pair .topc[data-player]'), 'Home shows the poster hero with a player photo, marked today and the group\'s top player');
  ok(await pg.evaluate(() => S.grp) === 'GROUP 2', 'the chosen group is remembered after reopening the app');
  ok(await pg.isVisible('.trow[data-player]'), 'Home shows this week\'s top players');
  await pg.click('.trow[data-player]'); await wait(300);
  ok(await pg.isVisible('.hero .name') && await pg.isVisible('nav.tabs [data-tab=home]'), 'a top player card opens that player\'s report card');
  // computer screen: the nav stands on the left and every screen uses two columns, with nothing spilling sideways
  await pg.setViewportSize({ width: 1366, height: 860 });
  for (const [t, cls] of [['home', 'home'], ['points', 'points'], ['setup', 'setup'], ['rank', 'rank'], ['downloads', null]]) {
    await pg.click(`nav.tabs [data-tab=${t}]`); await wait(250); await shot('9-desktop-' + t);
    const m = await pg.evaluate(c => {
      const nb = document.querySelector('nav.tabs .nav').getBoundingClientRect(), g = c && document.querySelector('.cols.' + c);
      return { side: nb.height > nb.width && nb.left < 200, cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 2, wide: document.documentElement.scrollWidth <= innerWidth };
    }, cls);
    ok(m.side && m.cols === 2 && m.wide, 'computer layout for ' + t + ' ' + JSON.stringify(m));
  }
  await pg.click('nav.tabs [data-tab=rank]'); await pg.click('.pod.first'); await wait(300); await shot('9-desktop-report');
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.cols.report')).gridTemplateColumns.split(' ').length === 2), 'computer layout for the report card');
  await pg.setViewportSize({ width: 390, height: 844 }); await wait(200);
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.cols')).display === 'contents' && document.documentElement.scrollWidth <= innerWidth), 'phone layout still stacks in one column');
  // group-wise: marking and the leaderboard only ever show one group, and there is no "all groups" choice
  await pg.setViewportSize({ width: 390, height: 844 }); await wait(200);
  await pg.click('nav.tabs [data-tab=rank]'); await wait(300);
  const gw = await pg.evaluate(() => { const g = S.grp, ids = [...document.querySelectorAll('.podium [data-player], .ranks [data-player]')].map(b => b.dataset.player);
    return { g, groups: groups(), n: ids.length, size: inGrp(g).length, same: ids.every(id => grpOf(pById(id)) === g), all: !!document.querySelector('[data-set=grp][data-val=All]') }; });
  ok(gw.groups.length > 1 && gw.n === gw.size && gw.same && !gw.all, 'leaderboard ranks one group at a time ' + JSON.stringify(gw));
  const other = gw.groups.find(x => x !== gw.g);
  await pg.click(`[data-set=grp][data-val="${other}"]`); await wait(300);
  const gw2 = await pg.evaluate(() => [...document.querySelectorAll('.podium [data-player], .ranks [data-player]')].map(b => grpOf(pById(b.dataset.player))));
  ok(gw2.length && gw2.every(x => x === other), 'switching group shows only that group ' + JSON.stringify(gw2));
  await pg.click('nav.tabs [data-tab=points]'); await wait(300);
  const pt = await pg.evaluate(() => ({ g: S.grp, rows: [...document.querySelectorAll('input[data-cell]')].map(i => grpOf(pById(i.dataset.cell.split('|')[1]))), all: !!document.querySelector('[data-set=grp][data-val=All]') }));
  ok(pt.g === other && pt.rows.length && pt.rows.every(x => x === other) && !pt.all, 'Mark Points shows the same single group ' + JSON.stringify({ g: pt.g, n: pt.rows.length }));
  // ties: players on the same points share a rank, ranks never skip (1, 1, 2, 2, 3, 4, 4, 5),
  // tied players share the No. 1 poster and the 2nd/3rd cards, and every player still has a button
  await pg.click('nav.tabs [data-tab=rank]'); await wait(200);
  const tie = await pg.evaluate(() => {
    const pts = [50, 50, 40, 40, 30, 20, 20, 10], d = dayOf(TODAY); d.marks.Daily = d.marks.Daily || {};
    pts.forEach((v, i) => { PLAYERS.push({ id: 'tie-' + i, name: 'Tie Player' + i, group: 'GROUP T', ag: 'U12' }); d.marks.Daily['tie-' + i] = { x: v }; });
    S.grp = 'GROUP T'; S.rdomain = 'Overall'; S.period = 'All time'; bump(); render();
    const q = s => [...document.querySelectorAll(s)];
    return { ranks: rankList('Overall', 'GROUP T', range('All time')).map(r => r.r).join(), joint: q('.pod.first.joint .h[data-player]').length,
      second: q('.pod.second.shared .mate[data-player]').length, third: q('.pod.third[data-player]').length,
      rows: q('.ranks .row .n').map(e => e.textContent).join(), tied: q('.ranks .eq').length,
      buttons: q('.podium [data-player], .ranks [data-player]').length, each: !!document.querySelector('.pod.first .score i') };
  });
  ok(tie.ranks === '1,1,2,2,3,4,4,5' && tie.joint === 2 && tie.second === 2 && tie.third === 1 && tie.rows === '4,4,5' && tie.tied === 2 && tie.buttons === 8 && tie.each,
    'tied players share the No. 1 poster and the 2nd card, and ranks never skip ' + JSON.stringify(tie));
  await shot('4b-rank-ties');
  await pg.click('.pod.first .h[data-player="tie-1"]'); await wait(300);
  ok(await pg.evaluate(() => S.player === 'tie-1'), 'tapping a joint No. 1 player opens their report');
  await pg.setViewportSize({ width: 1366, height: 900 }); await pg.click('nav.tabs [data-tab=rank]'); await wait(300); await shot('9-desktop-rank-ties');
  await pg.setViewportSize({ width: 390, height: 844 });
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  console.log('script calls:', calls);
  await br.close(); server.close();
  console.log(fails ? fails + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

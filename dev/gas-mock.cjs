// Runs apps-script/Code.gs in Node against an in-memory fake of the Apps Script
// services, so the backend can be tested without Google. Used by dev/e2e.cjs.
const fs = require('fs'), path = require('path'), vm = require('vm');

function makeSheet(name) {
  const rows = []; // array of arrays
  const sh = {
    name, rows,
    getLastRow: () => rows.length,
    getRange(r, c, nr = 1, nc = 1) {
      return {
        setValues(v) { for (let i = 0; i < nr; i++) { rows[r - 1 + i] = rows[r - 1 + i] || []; for (let j = 0; j < nc; j++) rows[r - 1 + i][c - 1 + j] = v[i][j]; } return this; },
        getDisplayValues() { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; out.push(Array.from({ length: nc }, (_, j) => disp(row[c - 1 + j]))); } return out; },
        setFontWeight() { return this; }
      };
    },
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    deleteRow(i) { rows.splice(i - 1, 1); },
    setFrozenRows() {}
  };
  return sh;
}
const disp = v => v == null ? '' : typeof v === 'string' && v[0] === "'" ? v.slice(1) : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);

function makeSS(id) {
  const sheets = [makeSheet('Sheet1')];
  return {
    sheets, getId: () => id, getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id,
    getSheetByName: n => sheets.find(s => s.name === n) || null,
    insertSheet(n) { const s = makeSheet(n); sheets.push(s); return s; },
    deleteSheet(s) { sheets.splice(sheets.indexOf(s), 1); },
    getSheets: () => sheets
  };
}

function load({ sourceRows }) {
  const books = {};
  const source = makeSS('1DZ_HsXbQ45DtPTNsMbJwlYCrBPNjEDS4NRIvi7RC4eM');
  const players = source.insertSheet('Players');
  sourceRows.forEach(r => players.rows.push(r));
  books[source.getId()] = source;
  const props = {};
  const logs = [];
  const ctx = {
    SpreadsheetApp: {
      openById: id => { if (!books[id]) throw new Error('No sheet ' + id); return books[id]; },
      create: () => { const id = 'data-' + Object.keys(books).length; books[id] = makeSS(id); return books[id]; }
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => '0123456789abcdef0123456789abcdef', formatDate: d => d.toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ text: s, setMimeType() { return this; } }) },
    Logger: { log: m => logs.push(m) },
    JSON, Date, String, Number, Object, Array, Math, RegExp
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), ctx);
  return { ctx, books, props, logs };
}
module.exports = { load };

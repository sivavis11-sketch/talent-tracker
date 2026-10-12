/**
 * Talent Tracker backend (Google Apps Script web app).
 *
 * - Reads players from the Players tab of your sports app sheet (only name,
 *   admission number, group, sport, gender, date of birth, active).
 * - Saves points, setup, coach notes and player changes in a separate
 *   "Talent Tracker Data" spreadsheet that setup() creates in your Drive.
 * - Every request must carry the secret key that setup() creates.
 *
 * Setup: run setup() once, then Deploy > New deployment > Web app,
 * Execute as: Me, Who has access: Anyone. See README.md.
 */

var SOURCE_SHEET_ID = '1DZ_HsXbQ45DtPTNsMbJwlYCrBPNjEDS4NRIvi7RC4eM';
var PLAYERS_TAB = 'Players';
var DAY_CELL_LIMIT = 49000; // a sheet cell holds at most 50,000 characters

var TABS = {
  Days: ['Date', 'Data', 'UpdatedAt'],
  Settings: ['Key', 'Data', 'UpdatedAt'],
  Notes: ['PlayerId', 'Text', 'UpdatedAt'],
  PlayerChanges: ['PlayerId', 'Data', 'UpdatedAt'],
  Points: ['Date', 'Domain', 'Activity', 'OutOf', 'PlayerId', 'Player', 'Group', 'Points']
};

// ---------- one-time setup ----------
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DATA_SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('Talent Tracker Data');
  props.setProperty('DATA_SHEET_ID', ss.getId());
  Object.keys(TABS).forEach(function (name) { tab_(ss, name); });
  var first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
  if (!props.getProperty('KEY')) props.setProperty('KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  // touch the source sheet so Google asks for permission now
  SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(PLAYERS_TAB);
  Logger.log('Data sheet: ' + ss.getUrl());
  Logger.log('Your app key: ' + props.getProperty('KEY'));
}

/** Run this to see your key again. */
function showKey() { Logger.log('Your app key: ' + PropertiesService.getScriptProperties().getProperty('KEY')); }

// ---------- web entry points ----------
function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  return handle_(body);
}

function handle_(p) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('KEY');
  if (!key || !props.getProperty('DATA_SHEET_ID')) return json_({ ok: false, error: 'not_set_up' });
  if (String(p.key || '') !== key) return json_({ ok: false, error: 'bad_key' });
  try {
    var a = p.action;
    if (a === 'ping') return json_({ ok: true });
    if (a === 'all') return json_({ ok: true, data: all_() });
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (a === 'saveDay') return json_(saveDay_(p.date, p.day));
      if (a === 'saveConfig') return json_(saveSetting_('config', p.config));
      if (a === 'saveNote') return json_(saveNote_(p.playerId, p.text));
      if (a === 'savePlayer') return json_(savePlayer_(p.playerId, p.player));
    } finally { lock.releaseLock(); }
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: 'server_error', message: String(err && err.message || err) });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------- reads ----------
function all_() {
  var ss = data_();
  var days = {};
  rows_(ss, 'Days').forEach(function (r) { var d = parse_(r[1]); if (d) days[String(r[0])] = d; });
  var notes = {};
  rows_(ss, 'Notes').forEach(function (r) { notes[String(r[0])] = String(r[1] || ''); });
  var settings = {};
  rows_(ss, 'Settings').forEach(function (r) { settings[String(r[0])] = parse_(r[1]); });
  return { players: players_(ss), days: days, notes: notes, config: settings.config || null, syncedAt: new Date().toISOString() };
}

function players_(ss) {
  var changes = {};
  rows_(ss, 'PlayerChanges').forEach(function (r) { var c = parse_(r[1]); if (c) changes[String(r[0])] = c; });
  var out = [], seen = {};
  var sh = SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(PLAYERS_TAB);
  if (sh) {
    var values = sh.getDataRange().getValues();
    var head = (values.shift() || []).map(function (h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); });
    var col = function (names) { for (var i = 0; i < head.length; i++) if (names.indexOf(head[i]) >= 0) return i; return -1; };
    var cName = col(['playername', 'name', 'studentname', 'fullname']), cAdm = col(['admissionnumber', 'admissionno', 'admno', 'admission']),
        cSport = col(['sport', 'sports']), cGroup = col(['group', 'batch']), cGender = col(['gender', 'sex']),
        cDob = col(['dateofbirth', 'dob', 'birthdate']), cActive = col(['active', 'status', 'isactive']);
    values.forEach(function (r) {
      var name = cName >= 0 ? String(r[cName]).trim() : '';
      if (!name) return;
      var sport = cSport >= 0 ? String(r[cSport]).trim() : '';
      if (sport && !/foot|soccer/i.test(sport)) return;
      var adm = cAdm >= 0 ? String(r[cAdm]).trim() : '';
      var id = adm ? 'a-' + safeId_(adm) : 'n-' + safeId_(name);
      if (seen[id]) return; seen[id] = true;
      var act = cActive >= 0 ? r[cActive] : '';
      var p = {
        id: id, name: name, adm: adm,
        group: cGroup >= 0 ? String(r[cGroup]).trim() : '',
        gender: cGender >= 0 ? String(r[cGender]).trim() : '',
        dob: cDob >= 0 ? dob_(r[cDob]) : '',
        active: act === true || act === '' || /^(true|yes|y|active|1)$/i.test(String(act).trim()),
        hidden: false, source: 'sheet'
      };
      if (changes[id]) p.hidden = !!changes[id].hidden;
      out.push(p);
    });
  }
  Object.keys(changes).forEach(function (id) {
    var c = changes[id];
    if (!seen[id] && c.source === 'manual' && c.name) {
      out.push({ id: id, name: String(c.name), adm: '', group: String(c.group || ''), gender: '', dob: String(c.dob || ''), active: c.active !== false, hidden: !!c.hidden, source: 'manual' });
    }
  });
  return out;
}

// ---------- writes ----------
function saveDay_(date, day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { ok: false, error: 'bad_date' };
  var text = JSON.stringify(day || {});
  if (text.length > DAY_CELL_LIMIT) return { ok: false, error: 'too_large' };
  var ss = data_();
  upsert_(ss, 'Days', date, [date, text, new Date().toISOString()]);
  writePointsView_(ss, date, day || {});
  return { ok: true };
}

function saveSetting_(key, value) { upsert_(data_(), 'Settings', key, [key, JSON.stringify(value || {}), new Date().toISOString()]); return { ok: true }; }
function saveNote_(pid, text) {
  if (!pid) return { ok: false, error: 'bad_player' };
  upsert_(data_(), 'Notes', pid, [pid, String(text || '').slice(0, 4000), new Date().toISOString()]);
  return { ok: true };
}
function savePlayer_(pid, p) {
  if (!pid || !p) return { ok: false, error: 'bad_player' };
  var keep = { name: p.name, group: p.group, dob: p.dob, active: p.active, hidden: !!p.hidden, source: p.source === 'manual' ? 'manual' : 'sheet' };
  upsert_(data_(), 'PlayerChanges', pid, [pid, JSON.stringify(keep), new Date().toISOString()]);
  return { ok: true };
}

/** Easy-to-read copy of each day's points: one row per player per activity. */
function writePointsView_(ss, date, day) {
  var sh = tab_(ss, 'Points');
  var last = sh.getLastRow();
  if (last > 1) {
    var dates = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (var i = dates.length - 1; i >= 0; i--) if (dates[i][0] === date) sh.deleteRow(i + 2);
  }
  var cfg = (rows_(ss, 'Settings').filter(function (r) { return r[0] === 'config'; })[0] || [])[1];
  cfg = parse_(cfg) || {};
  var names = {};
  try { players_(ss).forEach(function (p) { names[p.id] = p; }); } catch (e) {}
  var rows = [];
  var marks = day.marks || {};
  Object.keys(marks).forEach(function (dom) {
    var acts = dom === 'Special' ? (day.specials || []) : (((cfg.acts || {})[dom]) || []);
    var byId = {}; acts.forEach(function (a) { byId[a.id] = a; });
    Object.keys(marks[dom] || {}).forEach(function (pid) {
      var r = marks[dom][pid] || {};
      Object.keys(r).forEach(function (aid) {
        var a = byId[aid] || { name: aid, max: null };
        var p = names[pid] || {};
        rows.push(["'" + date, dom, a.name || aid, a.max == null ? '' : a.max, pid, p.name || '', p.group || '', Number(r[aid]) || 0]);
      });
    });
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ---------- helpers ----------
function data_() { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID')); }
function tab_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, TABS[name].length).setValues([TABS[name]]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function rows_(ss, name) {
  var sh = tab_(ss, name), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, TABS[name].length).getDisplayValues();
}
function upsert_(ss, name, key, row) {
  var sh = tab_(ss, name), last = sh.getLastRow();
  if (last > 1) {
    var keys = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) { sh.getRange(i + 2, 1, 1, row.length).setValues([asText_(row)]); return; }
  }
  sh.getRange(last + 1, 1, 1, row.length).setValues([asText_(row)]);
}
function asText_(row) { return row.map(function (v, i) { return i === 0 ? "'" + v : v; }); } // keep keys like dates as plain text
function parse_(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function safeId_(s) { return String(s).trim().replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 120); }
function dob_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim(), m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return m[1] + '-' + pad_(m[2]) + '-' + pad_(m[3]);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  if (m) return m[3] + '-' + pad_(m[2]) + '-' + pad_(m[1]);
  return '';
}
function pad_(n) { return ('0' + n).slice(-2); }

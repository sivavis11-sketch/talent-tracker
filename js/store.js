// ================= saving to your Google Sheet (Apps Script web app) =================
// Connection (web app address + key) lives on this device only. Changes go into an
// outbox first, so points typed without signal are kept and sent when back online.
const CONN_KEY="tt-conn",OUTBOX_KEY="tt-outbox",CACHE_KEY="tt-cache";
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
let CONN=ls.get(CONN_KEY,null);
(()=>{ // one-time setup link: .../#api=<web app url>&key=<key>
  const h=new URLSearchParams(location.hash.slice(1));
  if(h.get("api")&&h.get("key")){CONN={api:h.get("api").trim(),key:h.get("key").trim()};ls.set(CONN_KEY,CONN);history.replaceState(null,"",location.pathname+location.search)}
})();
let OUTBOX=ls.get(OUTBOX_KEY,{});   // path -> body, newest change per path
let saveErr=null,online=navigator.onLine!==false,draining=false;
const dirty=new Set(),timers={};

async function api(action,params={},post=false){
  if(!CONN)throw {code:"not_connected"};
  let res;
  try{
    if(post)res=await fetch(CONN.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...params,action,key:CONN.key})});
    else res=await fetch(CONN.api+(CONN.api.includes("?")?"&":"?")+new URLSearchParams({...params,action,key:CONN.key}));
  }catch(_){throw {code:"offline"}}
  if(!res.ok)throw {code:"http",message:"HTTP "+res.status};
  let j;try{j=await res.json()}catch(_){throw {code:"bad_reply"}}
  if(!j.ok)throw {code:j.error||"server_error",message:j.message||""};
  return j;
}
function connProblem(e){
  const c=e&&e.code;
  if(c==="offline")return "No internet right now. Your points are kept on this phone and sent when you're back online.";
  if(c==="bad_key")return "The key doesn't match. Run showKey in your Apps Script and enter it again.";
  if(c==="not_set_up")return "The Apps Script isn't set up yet. Run setup() in it once.";
  if(c==="bad_reply"||c==="http")return "That web address didn't answer like the Talent Tracker script. Check you copied the Web app URL that ends in /exec.";
  if(c==="too_large")return "This day has too many points to fit in one sheet cell. Split it into two dates.";
  return "The sheet couldn't save that: "+((e&&e.message)||c||"unknown problem");
}

// ---------- writes ----------
function write(path,body){OUTBOX[path]=body;ls.set(OUTBOX_KEY,OUTBOX);showSave();return drain()}
async function drain(){
  if(draining||!CONN)return;draining=true;
  try{
    for(const path of Object.keys(OUTBOX)){
      const body=OUTBOX[path],[kind,id]=path.split(/\/(.*)/s);
      try{
        if(kind==="days")await api("saveDay",{date:id,day:body},true);
        else if(path==="config/setup")await api("saveConfig",{config:body},true);
        else if(kind==="notes")await api("saveNote",{playerId:id,text:body.text},true);
        else if(kind==="players")await api("savePlayer",{playerId:id,player:body},true);
        if(OUTBOX[path]===body){delete OUTBOX[path];ls.set(OUTBOX_KEY,OUTBOX)}
        saveErr=null;online=true;
      }catch(e){
        if(e.code==="offline"){online=false;saveErr=null;break}
        saveErr=connProblem(e);toast(saveErr);
        if(e.code==="too_large"||e.code==="bad_date"){delete OUTBOX[path];ls.set(OUTBOX_KEY,OUTBOX)}
        break;
      }
    }
  }finally{draining=false;showSave()}
  if(Object.keys(OUTBOX).length&&online&&!saveErr)return drain();
}
function queueDay(date,ms=1200){dirty.add(date);showSave();clearTimeout(timers[date]);timers[date]=setTimeout(()=>flushDay(date),ms)}
function flushDay(date){
  clearTimeout(timers[date]);delete timers[date];
  const d=normDay(dayOf(date));d.updatedAt=new Date().toISOString();
  const p=write("days/"+date,d);if(!timers[date])dirty.delete(date);showSave();return p;
}
const flushAll=()=>Promise.all([...dirty].map(flushDay));
const saveCfg=()=>write("config/setup",clone(CFG));
function showSave(){const el=document.getElementById("savestate");if(!el)return;const n=Object.keys(OUTBOX).length;
  el.innerHTML=!CONN?'<span class="ldot wait"></span>Not connected to your sheet':saveErr?'<span class="ldot wait"></span>'+esc(saveErr)
    :!online&&n?'<span class="ldot wait"></span>Offline · '+n+' change'+(n>1?"s":"")+' kept on this phone':dirty.size||n?'<span class="ldot wait"></span>Saving…':'<span class="ldot"></span>All changes saved to your sheet'}

// ---------- reads ----------
let pendingRender=false;
function renderSoon(){const a=document.activeElement;if(a&&a.closest&&a.closest("#view")&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){pendingRender=true;showSave();return}render()}
document.addEventListener("focusout",()=>setTimeout(()=>{const a=document.activeElement;if(pendingRender&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))){pendingRender=false;render()}},0));
function applyData(x){
  PLAYERS=(x.players||[]).map(p=>({...p,name:String(p.name||"Player"),ag:ageGroup(p.dob)}));
  const local=new Set([...dirty,...Object.keys(OUTBOX).filter(k=>k.startsWith("days/")).map(k=>k.slice(5))]);
  const next={};Object.entries(x.days||{}).forEach(([k,v])=>{next[k]=local.has(k)&&DAYS[k]?DAYS[k]:v});local.forEach(k=>{if(DAYS[k])next[k]=DAYS[k]});
  if(DAYS[S.date]&&!next[S.date])next[S.date]=DAYS[S.date];DAYS=next;
  NOTES={...(x.notes||{})};Object.keys(OUTBOX).filter(k=>k.startsWith("notes/")).forEach(k=>NOTES[k.slice(6)]=OUTBOX[k].text);
  const cfg=OUTBOX["config/setup"]||x.config;if(cfg)CFG={...clone(DEFAULT_CFG),...clone(cfg),acts:{...clone(DEFAULT_CFG.acts),...(cfg.acts||{})}};
  Object.keys(OUTBOX).filter(k=>k.startsWith("players/")).forEach(k=>{const id=k.slice(8),b=OUTBOX[k],i=PLAYERS.findIndex(p=>p.id===id),np={...b,id,ag:ageGroup(b.dob)};if(i<0)PLAYERS.push(np);else PLAYERS[i]={...PLAYERS[i],hidden:b.hidden}});
  SYNCINFO={at:x.syncedAt,count:PLAYERS.filter(p=>p.active!==false).length};
  LOADED.players=true;LOADED.days=true;bump();
}
let lastSig="";
async function loadAll(){
  const j=await api("all");const sig=JSON.stringify(j.data);online=true;
  if(sig!==lastSig){lastSig=sig;applyData(j.data);ls.set(CACHE_KEY,j.data);renderSoon()}else showSave();
  drain();
}
function startStore(){
  const cached=ls.get(CACHE_KEY,null);if(cached){applyData(cached);render()}
  loadAll().catch(e=>{if(e.code==="offline"){online=false;LOADED.players=LOADED.days=true;render()}else{saveErr=connProblem(e);render()}});
  setInterval(()=>{if(!document.hidden&&!draining)loadAll().catch(()=>{})},120000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadAll().catch(()=>{})});
  addEventListener("online",()=>{online=true;drain();loadAll().catch(()=>{})});
  addEventListener("offline",()=>{online=false;showSave()});
}
const use=()=>Promise.resolve(null); // no Claude capabilities outside Claude

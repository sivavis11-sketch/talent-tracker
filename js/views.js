// ================= screens (glass bento over full-screen photos) =================
const S={tab:"home",date:TODAY,doms:["Daily"],grp:(()=>{try{return localStorage.getItem("tt-grp")||""}catch(_){return ""}})(),setDom:"Daily",setMode:"acts",newAct:"",newMax:"",newDom:"",
  rdomain:"Overall",age:"All",period:"All time",dlPeriod:"This month",player:null,dlp:"",notes:true,np:{name:"",group:"",dob:""},sync:null,busy:""};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3200)}
const ord=n=>n?n+(["th","st","nd","rd"][(n%100-20)%10]||["th","st","nd","rd"][n%100]||"th"):"–";
const fmtDate=d=>new Date(d+"T00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
const initials=n=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const BG={connect:"home",home:"home",points:"points",setup:"setup",rank:"rank",downloads:"downloads",report:"report"};
const topbar=(title,back)=>`<div class="top">${back?`<button class="circ" data-${back} aria-label="Back">${BACKI}</button>`:""}<span class="title">${title}</span><span style="flex:1"></span><button class="circ" data-tab="home" aria-label="Home">${HOMEI}</button></div>`;
const seg=(key,opts,cur,label=x=>x)=>`<div class="seg chiprow">${opts.map(o=>`<button data-set="${key}" data-val="${esc(o)}" aria-pressed="${o===cur}">${esc(label(o))}</button>`).join("")}</div>`;
const domBtn=(d,attr,pressed,dot)=>`<button class="domb" ${attr}><span class="ico" aria-pressed="${pressed}">${icon(d)}${dot?'<span class="dot" aria-label="has points"></span>':""}</span>${esc(d)}</button>`;
const noPlayers=()=>`<div class="glass pad stack"><div class="rowx"><span class="ldot"></span><h3>Add your players</h3></div><span class="small">${LOADED.players||!CONN?"Bring in your football players from your sports app sheet, or add them by hand.":"Loading your players…"}</span>${LOADED.players||!CONN?`<button class="pillbtn" data-go="setup" data-mode="players">Players<span class="arr">${ARR}</span></button>`:""}</div>`;
const saveLine=()=>`<div class="saved" id="savestate"></div>`;

function todayStats(){
  const t=(DAYS[TODAY]||{}).marks||{},marked=markedOn(TODAY),per={};
  marked.filter(counts).forEach(d=>Object.entries(t[d]||{}).forEach(([id,r])=>{per[id]=(per[id]||0)+sumRow(r)}));
  const ids=Object.keys(per).filter(k=>per[k]>0&&pById(k));const pts=ids.reduce((a,k)=>a+per[k],0);
  const best=ids.sort((a,b)=>per[b]-per[a])[0];
  const touched=new Set();marked.forEach(d=>Object.entries(t[d]||{}).forEach(([id,r])=>{if(Object.keys(r||{}).length)touched.add(id)}));
  return {marked,pts,touched:[...touched].filter(pById).length,best:best?{p:pById(best),s:per[best]}:null};
}

const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
function installRow(){
  if(standalone())return "";
  if(typeof installEvt!=="undefined"&&installEvt)return `<div class="glass toggle"><span>Install Talent Tracker on this device</span><button class="sw" data-act="install" aria-pressed="false">Install</button></div>`;
  if(isIOS())return `<div class="glass pad small">To install: tap the Share button in Safari, then <b>Add to Home Screen</b>.</div>`;
  return "";
}
function connectView(){
  if(!S.c)S.c={api:CONN?CONN.api:"",key:CONN?CONN.key:""};
  return `
  <div class="top"><h1 class="greet">Talent<br><b>Tracker</b></h1></div>
  <span class="eyebrow">Connect your Google Sheet</span>
  <div class="spacer" style="--h:min(30vh,220px)"></div>
  <div class="glass pad stack">
    <div class="rowx"><span class="ldot"></span><h3>One-time setup</h3></div>
    <span class="small">Paste the Web app URL and key from your Talent Tracker Apps Script. The README in your talent-tracker repo shows where to find them.</span>
    ${S.connErr?`<div class="in banner warn"><span class="ldot wait"></span><span>${esc(S.connErr)}</span></div>`:""}
    <input type="url" id="c-api" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(S.c.api)}" autocomplete="off">
    <input type="text" id="c-key" placeholder="Key" value="${esc(S.c.key)}" autocomplete="off">
    <button class="pillbtn" data-act="connect" ${S.busy==="connect"?"disabled":""}>${S.busy==="connect"?"Connecting…":"Connect"}<span class="arr">${ARR}</span></button>
    ${CONN&&S.tab==="connect"?`<button class="ghostbtn" data-tab="home">Cancel</button>`:""}
  </div>`;
}
function homeView(){
  const st=todayStats(),n=active().length,pct=n?Math.round(st.touched/n*100):0,lead=rankList("Overall","All",range("All time"))[0];
  const sp=((DAYS[TODAY]||{}).specials||[]).filter(x=>x.name).length;
  const hour=new Date().getHours(),part=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  return `
  <div class="top"><h1 class="greet">Hi Siva,<br><b>Welcome!</b></h1><button class="circ" data-tab="rank" aria-label="Leaderboard"><svg viewBox="0 0 48 48" class="rimg">${ICONS.Overall}</svg></button></div>
  <span class="eyebrow">${part} · ${fmtDate(TODAY)}</span>
  <div class="spacer" style="--h:min(46vh,330px)"></div>
  ${n?"":noPlayers()}
  <div class="lbl">My Academy</div>
  <div class="bento">
    <div class="glass pad s3"><h3 style="font-size:14px">Today's Domains</h3>
      <div class="icos scroll" style="margin-top:10px">${CFG.domains.map(d=>`<button class="ico" data-go="points" data-pick="${esc(d)}" aria-label="Mark ${esc(d)}" aria-pressed="false">${icon(d)}${st.marked.includes(d)?'<span class="dot"></span>':""}</button>`).join("")}</div></div>
    <button class="glass s1 plus" data-go="points"><span class="circ">+</span>Mark<br>Points</button>
  </div>
  <div class="lbl">Today's Session</div>
  <div class="glass pad">
    <div class="bento" style="grid-template-columns:1.1fr 1fr 1fr;align-items:stretch">
      <div style="display:flex;flex-direction:column;justify-content:space-between;gap:8px;grid-row:span 2">
        <h3>Points Given</h3><span class="big">${st.pts}</span>
        <span class="small">${st.marked.length?st.marked.map(esc).join(", "):"Nothing marked yet"}</span>
      </div>
      <div class="in pad" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px"><span class="small">Players</span><span class="big" style="font-size:22px">${n}</span></div>
      <div class="in" style="display:grid;place-items:center;padding:8px"><div class="ring" style="--p:${pct}"><span>Marked<br>${pct}%</span></div></div>
      <div class="in pad" style="padding:10px;display:flex;flex-direction:column;gap:2px"><span class="ldot"></span><span class="small" style="margin-top:4px">Special</span><b style="font-weight:500">${sp} today</b></div>
      <div class="in pad" style="padding:10px;display:flex;flex-direction:column;gap:2px;min-width:0"><span class="small">Top today</span><b class="ell" style="font-weight:500">${st.best?esc(st.best.p.name):"None yet"}</b><span class="small num">${st.best?st.best.s+" pts":""}</span></div>
    </div>
  </div>
  ${installRow()}
  <div class="top" style="align-items:center"><div class="lbl">Leaderboard</div><button class="link" data-tab="rank">View All</button></div>
  ${lead&&lead.s>0?`<button class="glass toggle" data-player="${esc(lead.p.id)}" style="cursor:pointer;color:inherit;font:inherit;text-align:left;padding:10px 16px 10px 10px">
    <span class="rowx"><span class="ring" style="--p:100;width:46px;height:46px"><span style="width:38px;height:38px;font-weight:600;font-size:14px">${esc(initials(lead.p.name))}</span></span>
    <span class="grow"><span class="ell">${esc(lead.p.name)} leads the academy</span><span class="small num">${lead.s} pts · ${esc(lead.p.ag)}</span></span></span>
    <span class="sw" aria-hidden="true" style="pointer-events:none">1st</span></button>`:`<div class="glass pad small">The leader appears here once you save some points.</div>`}`;
}

function pointsView(){
  if(S.grp!=="All"&&!groups().includes(S.grp))S.grp=groups()[0]||"All";
  const sel=CFG.domains.filter(d=>S.doms.includes(d));
  const ps=active().filter(p=>S.grp==="All"||p.group===S.grp);
  const marked=markedOn(S.date),cnt=sel.filter(counts),m=dayOf(S.date).marks;
  const rowTot=pid=>cnt.reduce((a,d)=>a+sumRow((m[d]||{})[pid]),0);
  const head=d=>acts(d).length||1;
  const table=!active().length?`<p class="small" style="margin:0 8px 8px">No players yet.</p>`:!sel.length?`<p class="small" style="margin:0 8px 8px">Tap one or more domains above.</p>`:`
    <div class="grid-wrap"><table class="grid">
      <thead><tr><th class="nm" rowspan="2" style="background:transparent">Player</th>${sel.map(d=>`<th colspan="${head(d)}" class="grp sep"><b>${esc(d)}</b></th>`).join("")}${cnt.length?`<th rowspan="2">Total<b>pts</b></th>`:""}</tr>
      <tr>${sel.map(d=>acts(d).length?acts(d).map((a,i)=>`<th class="${i===0?"sep":""}">${acts(d).length>1||d==="Special"?esc(a.name||"Special "+(i+1)):""}<b>${a.max==null?"pts":"/"+a.max}</b></th>`).join(""):`<th class="sep">No activities</th>`).join("")}</tr></thead>
      <tbody>${ps.map(p=>`<tr><td class="nm">${esc(p.name)}<small>${esc([p.group,p.ag].filter(Boolean).join(" · "))}</small></td>${sel.map(d=>{const r=(m[d]||{})[p.id]||{};
        return acts(d).length?acts(d).map((a,i)=>{const v=r[a.id]??"";const over=a.max!=null&&+v>a.max;
          return `<td class="${i===0?"sep":""}"><input class="box${over?" over":""}" inputmode="numeric" data-cell="${esc(d)}|${esc(p.id)}|${esc(a.id)}" value="${esc(v)}" aria-label="${esc(p.name)} ${esc(d)} ${esc(a.name)}${a.max==null?"":" out of "+a.max}"></td>`}).join(""):`<td class="sep"></td>`}).join("")}${cnt.length?`<td class="tt" data-tt="${esc(p.id)}">${rowTot(p.id)}</td>`:""}</tr>`).join("")||`<tr><td class="small" colspan="9">No players in this group.</td></tr>`}</tbody>
    </table></div>`;
  return `
  ${topbar("Mark Points","tab=home")}
  <div class="spacer" style="--h:110px"></div>
  <div class="lbl">Points for the day</div>
  <div class="bento">
    <div class="glass pad s4 stack">
      <div class="top" style="align-items:center"><h3>Group</h3><span class="small">${ps.length} player${ps.length===1?"":"s"}</span></div>
      ${groups().length?seg("grp",[...groups(),"All"],S.grp,x=>x==="All"?"All groups":x):`<span class="small">Groups appear here after you sync or add players.</span>`}
    </div>
    <div class="glass pad s4" style="display:flex;flex-direction:column;gap:12px">
      <div class="top" style="align-items:center"><h3>Domains</h3><input type="date" id="date" value="${S.date}" max="${TODAY}" style="width:auto;padding:6px 10px;font-size:12px" aria-label="Date"></div>
      <div class="icos scroll" style="justify-content:space-between">${CFG.domains.map(d=>domBtn(d,`data-dom="${esc(d)}"`,sel.includes(d),marked.includes(d))).join("")}</div>
    </div>
    ${sel.includes("Special")?`<div class="glass pad s4 stack"><div class="rowx"><span class="ldot"></span><h3>Special challenges</h3></div>
      ${specials().map((x,i)=>`<div class="rowx" style="align-items:flex-end"><div style="flex:2"><span class="small">Challenge ${i+1}</span><input type="text" data-spname="${x.id}" placeholder="What was it?" value="${esc(x.name)}"></div>
        <div style="flex:1"><span class="small">Out of</span><input type="text" inputmode="numeric" data-spmax="${x.id}" placeholder="No limit" value="${x.max??""}"></div>
        ${specials().length>1?`<button class="x" data-delsp="${x.id}" aria-label="Remove challenge ${i+1}">✕</button>`:""}</div>`).join("")}
      <button class="ghostbtn" data-act="addsp">+ Add another special challenge</button></div>`:""}
    <div class="glass s4" style="padding:12px 8px 8px">
      <div class="top" style="padding:0 6px 8px;align-items:center"><h3>${sel.length?sel.map(esc).join(" + "):"No domain selected"}</h3><span class="small">${S.grp==="All"?"All groups":esc(S.grp)} · ${fmtDate(S.date)}</span></div>
      ${table}
    </div>
  </div>
  ${sel.length&&ps.length?`<button class="pillbtn" data-act="save">Save points<span class="arr">${ARR}</span></button>`:""}
  ${saveLine()}
  <p class="small" style="margin:0">Points save as you type and add to each player's total.${sel.some(d=>!counts(d))?" "+sel.filter(d=>!counts(d)).join(", ")+" is not added to the total.":""} A green dot means that domain already has points on this date.</p>`;
}

function setupView(){
  const mode=S.setMode;
  return `
  ${topbar("Challenges","tab=home")}
  <div class="spacer" style="--h:130px"></div>
  ${seg("setMode",["acts","players"],mode,x=>x==="acts"?"Activities & points":"Players")}
  ${mode==="players"?playersPanel():actsPanel()}
  ${saveLine()}`;
}
function actsPanel(){
  const d=S.setDom,isSp=d==="Special",tot=isSp?null:outOf(d),list=CFG.acts[d]||[];
  return `
  <div class="lbl">Set up points</div>
  <div class="glass pad"><div class="icos scroll" style="justify-content:space-between">${CFG.domains.map(x=>domBtn(x,`data-set="setDom" data-val="${esc(x)}"`,x===d,false)).join("")}</div></div>
  ${isSp?`<div class="glass pad"><h3>Special</h3><p class="small" style="margin:6px 0 0">Special challenges are named on the day. Select Special on Mark Points, type what the challenge was, and add more if there were several.</p></div>`:`
  <div class="bento">
    <div class="glass s3" style="padding:6px 0">
      <div class="top" style="padding:8px 14px"><h3>${esc(d)}</h3><span class="small">${tot==null?"No limit":"Total /"+tot}</span></div>
      <div class="list">${list.map(a=>`<div class="rowx" style="cursor:default"><span class="grow ell">${esc(a.name)}</span><span class="small num">${a.max==null?"no limit":"/"+a.max}</span><button class="x" data-delact="${esc(a.id)}" aria-label="Remove ${esc(a.name)}">✕</button></div>`).join("")||`<p class="small" style="padding:0 14px">No activities yet.</p>`}</div>
    </div>
    <button class="glass s1 plus" data-act="focusadd"><span class="circ">+</span>Add New Activity</button>
    <div class="glass pad s4 stack">
      <h3>New activity in ${esc(d)}</h3>
      <div class="rowx"><input type="text" id="newact" placeholder="Activity name" value="${esc(S.newAct)}" style="flex:2"><input type="text" inputmode="numeric" id="newmax" placeholder="Out of" value="${esc(S.newMax)}" style="flex:1"></div>
      <button class="pillbtn" data-act="addact">Add activity<span class="arr">${ARR}</span></button>
    </div>
  </div>`}
  <div class="glass toggle"><span>Add ${esc(d)} to the overall total</span><button class="sw" data-act="counts" aria-pressed="${counts(d)}">${counts(d)?"On":"Off"}</button></div>
  <div class="glass toggle"><input type="text" id="newdom" placeholder="New domain, e.g. Passing" value="${esc(S.newDom)}" style="background:transparent;border:0;padding:6px 0"><button class="ghostbtn" data-act="adddom">Add</button></div>`;
}
function playersPanel(){
  const on=p=>p.active!==false&&!p.hidden;const all=[...PLAYERS].sort((a,b)=>on(b)-on(a)||a.name.localeCompare(b.name));
  const st=S.sync;
  return `
  <div class="lbl">Players</div>
  <div class="bento">
    <div class="glass pad s4 stack">
      <div class="rowx"><span class="circ" style="width:40px;height:40px">${SYNCI}</span><div class="grow"><h3>From your sports app</h3><span class="small">${SYNCINFO?`Last read ${new Date(SYNCINFO.at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})} · ${SYNCINFO.count} players`:"Not synced yet"}</span></div></div>
      <span class="small">The app reads football players straight from the Players tab each time it opens: name, admission number, group, gender and date of birth only. Contacts, medical notes and fees are never read.</span>
      ${st?`<div class="in banner ${st.kind==="err"?"warn":""}"><span class="ldot ${st.kind==="err"?"wait":""}"></span><span>${esc(st.msg)}</span></div>`:""}
      <button class="pillbtn" data-act="sync" ${S.busy==="sync"?"disabled":""}>${S.busy==="sync"?"Reading…":"Refresh players"}<span class="arr">${ARR}</span></button>
    </div>
    <div class="glass pad s4 stack">
      <h3>Add a player by hand</h3>
      <input type="text" id="np-name" placeholder="Player name" value="${esc(S.np.name)}">
      <div class="rowx"><input type="text" id="np-group" placeholder="Group" value="${esc(S.np.group)}" list="grouplist" style="flex:1"><input type="date" id="np-dob" value="${esc(S.np.dob)}" aria-label="Date of birth" style="flex:1"></div>
      <datalist id="grouplist">${groups().map(g=>`<option value="${esc(g)}">`).join("")}</datalist>
      <button class="ghostbtn" data-act="addplayer">+ Add player</button>
    </div>
  </div>
  <div class="glass toggle"><span class="small" style="min-width:0">Connected to your Google Sheet</span><button class="ghostbtn mini" data-act="disconnect">Change</button></div>
  <div class="glass list" style="padding:4px 0">${all.map(p=>`<div class="rowx" style="cursor:default"><span class="av" style="width:32px;height:32px;font-size:12px">${esc(initials(p.name))}</span><span class="grow"><span class="ell">${esc(p.name)}</span><span class="small">${esc([p.group,p.ag,p.adm?"#"+p.adm:""].filter(Boolean).join(" · "))}</span></span>${p.active===false?'<span class="small">Inactive</span>':`<button class="sw" data-hide="${esc(p.id)}" aria-pressed="${!p.hidden}" aria-label="Show ${esc(p.name)} in the app">${!p.hidden?"On":"Off"}</button>`}</div>`).join("")||`<div class="empty">${LOADED.players||!CONN?"No players yet.":"Loading…"}</div>`}</div>`;
}

function gauge(pct,label,sub){
  const ticks=Array.from({length:41},(_,i)=>{const a=Math.PI*(1-i/40),on=i/40<=pct/100;const r1=88,r2=on?104:100;
    return `<line x1="${(120+r1*Math.cos(a)).toFixed(1)}" y1="${(118-r1*Math.sin(a)).toFixed(1)}" x2="${(120+r2*Math.cos(a)).toFixed(1)}" y2="${(118-r2*Math.sin(a)).toFixed(1)}" stroke="${on?"#ffffff":"rgba(255,255,255,.3)"}" stroke-width="2" stroke-linecap="round"/>`}).join("");
  return `<svg class="gauge" viewBox="0 0 240 132" role="img" aria-label="${label} ${pct}%">${ticks}<circle cx="${(120+96*Math.cos(Math.PI*(1-pct/100))).toFixed(1)}" cy="${(118-96*Math.sin(Math.PI*(1-pct/100))).toFixed(1)}" r="5" fill="#39e639"/><text x="120" y="98" text-anchor="middle" fill="#fff" font-family="Poppins,sans-serif" font-weight="600" font-size="26">${pct}%</text><text x="120" y="120" text-anchor="middle" fill="rgba(255,255,255,.75)" font-family="Poppins,sans-serif" font-size="12">${sub}</text></svg>`;
}

const PERIODS=["This week","This month","Last 3 months","All time"];
function rankView(){
  const rg=range(S.period),list=rankList(S.rdomain,S.age,rg);const [a,b,c]=list;
  const pod=(r,cls)=>r?`<button class="pod ${cls}" data-player="${esc(r.p.id)}"><span class="av">${esc(initials(r.p.name))}</span><b>${esc(r.p.name)}</b><span class="small num">${r.s} pts</span><span class="step">${r.r}</span></button>`:"<span></span>";
  return `
  ${topbar("Leaderboard","tab=home")}
  <div class="spacer" style="--h:100px"></div>
  <div class="lbl">${S.rdomain==="Overall"?"Overall":esc(S.rdomain)} · ${S.age==="All"?"All ages":esc(S.age)}</div>
  <div class="glass pad stack">
    <div class="icos scroll" style="justify-content:space-between">${domBtn("Overall",'data-set="rdomain" data-val="Overall"',S.rdomain==="Overall",false)}${domainsWithData().map(x=>domBtn(x,`data-set="rdomain" data-val="${esc(x)}"`,x===S.rdomain,false)).join("")}</div>
    ${seg("age",["All",...ageGroups()],S.age,x=>x==="All"?"All ages":x)}
    ${seg("period",PERIODS,S.period)}
  </div>
  ${list.length?`<div class="glass pad"><div class="podium">${pod(b,"second")}${pod(a,"first")}${pod(c,"third")}</div></div>
  <div class="glass list" style="padding:4px 0">${list.slice(3).map(r=>`<button class="rowx" data-player="${esc(r.p.id)}"><span class="rk">${r.r}</span><span class="av" style="width:32px;height:32px;font-size:12px">${esc(initials(r.p.name))}</span><span class="grow"><span class="ell">${esc(r.p.name)}</span><span class="small">${esc([r.p.ag,r.p.group].filter(Boolean).join(" · "))}</span></span><span class="pts">${r.s}</span></button>`).join("")||`<div class="empty">Only three players here.</div>`}</div>`:noPlayers()}`;
}

function downloadsView(){
  const ps=active();if(!S.dlp&&ps[0])S.dlp=ps[0].id;
  const tile=(t,sub,kind)=>`<div class="glass pad s2" style="display:flex;flex-direction:column;gap:10px;justify-content:space-between"><div><h3 style="font-size:14px">${t}</h3><span class="small">${sub}</span></div><button class="circ" data-pdf="${kind}" aria-label="Download ${t} PDF" style="width:40px;height:40px" ${S.busy?"disabled":""}>${S.busy===kind?"…":DLI}</button></div>`;
  return `
  ${topbar("Downloads","tab=home")}
  <div class="spacer" style="--h:110px"></div>
  <div class="lbl">Reports</div>
  ${seg("dlPeriod",PERIODS,S.dlPeriod)}
  <div class="bento">
    <div class="glass pad s4 stack">
      <div class="rowx"><span class="ldot"></span><h3>Player Report Card</h3></div>
      <span class="small">Overall and domain ranks, scores, juggling counts, trends and your coach note.</span>
      <select id="dlplayer" aria-label="Player">${ps.map(p=>`<option value="${esc(p.id)}" ${S.dlp===p.id?"selected":""}>${esc(p.name)} · ${esc(p.ag)}</option>`).join("")||"<option>No players yet</option>"}</select>
      <div class="rowx"><button class="pillbtn" data-pdf="card" style="flex:1" ${ps.length&&!S.busy?"":"disabled"}>${S.busy==="card"?"Making PDF…":"Download PDF"}<span class="arr">${ARR}</span></button><button class="ghostbtn" data-act="preview" ${ps.length?"":"disabled"}>Preview</button></div>
    </div>
    ${tile("Overall Leaderboard","All players, every domain","overall")}
    ${tile("By Age Group",esc(ageGroups().join(" · ")||"Age groups"),"age")}
    ${tile("Domain Rankings","One page per domain","domains")}
    ${tile("Day Sheets","Every point, by date","days")}
  </div>
  <div class="glass toggle"><span>Include coach notes</span><button class="sw" data-act="note" aria-pressed="${S.notes}">${S.notes?"On":"Off"}</button></div>`;
}

function spark(vals){
  const w=160,h=56,pad=6,mx=Math.max(...vals,1),mn=Math.min(...vals,0),span=mx-mn||1;
  const pts=vals.map((v,i)=>[pad+i*(w-2*pad)/(vals.length-1),h-pad-(v-mn)/span*(h-2*pad)]);
  const d=pts.map((q,i)=>(i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join(" ");const l=pts.at(-1);
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Weekly points ${vals.join(", ")}"><path d="${d} L${l[0].toFixed(1)} ${h-pad} L${pad} ${h-pad} Z" fill="rgba(255,255,255,.14)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="3.5" fill="#39e639"/></svg>`;
}
function cardData(pid,period){
  const p=pById(pid),rg=range(period),wk=range("This week"),all=active(),n=all.length;
  const has=overall(pid,rg)>0,oAge=has?rankOf(pid,"Overall",p.ag,rg):0,oAll=has?rankOf(pid,"Overall","All",rg):0,nAge=all.filter(x=>x.ag===p.ag).length;
  const ahead=n>1?Math.round(all.filter(x=>overall(x.id,rg)<overall(pid,rg)).length/(n-1)*100):0;
  const doms=domainsWithData().map(d=>{const w=weekly(pid,d),pts=score(pid,d,rg);return {d,pts,week:score(pid,d,wk),best:Math.max(...w),rAge:pts?rankOf(pid,d,p.ag,rg):0,rAll:pts?rankOf(pid,d,"All",rg):0,w,counts:counts(d)}});
  return {p,period,rg,oAge,oAll,n,nAge,ahead,total:overall(pid,rg),doms,jug:jugBest(pid,rg),note:NOTES[pid]||""};
}
function reportView(){
  const p=pById(S.player);if(!p){S.player=null;return homeView()}
  const c=cardData(p.id,S.period);
  const rows=c.doms.map(x=>`<tr><td>${esc(x.d)}${x.counts?"":' <span class="small">(not in total)</span>'}</td><td class="r">${x.pts}</td><td class="r">${x.week}</td><td class="r">${ord(x.rAge)} / ${ord(x.rAll)}</td></tr>`).join("");
  const trends=c.doms.map(x=>{const ch=x.w.at(-1)-x.w.at(-2);return `<figure class="in"><figcaption><span>${esc(x.d)}</span><span>${ch>=0?"+":""}${ch}</span></figcaption>${spark(x.w)}</figure>`}).join("");
  return `
  ${topbar(esc(p.name),"act=back")}
  <div class="spacer" style="--h:80px"></div>
  <div class="lbl">Report Card</div>
  <div class="glass pad">
    <div class="top"><div style="min-width:0"><h3 style="font-size:20px">${esc(p.name)}</h3><span class="small">${esc([p.ag,p.group,p.adm?"#"+p.adm:""].filter(Boolean).join(" · "))}</span></div><span class="ghostbtn mini"><span class="ldot"></span> ${esc(S.period)}</span></div>
    ${gauge(c.ahead,"Ahead of","ahead of other players")}
    <div class="bento" style="grid-template-columns:1fr 1fr">
      <div class="in pad rowx"><span class="circ" style="width:40px;height:40px"><svg viewBox="0 0 48 48" class="rimg">${ICONS.Special}</svg></span><span class="grow"><span class="small">Rank in ${esc(p.ag)}</span><b style="display:block;font-weight:600;font-size:18px">${ord(c.oAge)}<span class="small"> of ${c.nAge}</span></b></span></div>
      <div class="in pad rowx"><span class="circ" style="width:40px;height:40px"><svg viewBox="0 0 48 48" class="rimg">${ICONS.Overall}</svg></span><span class="grow"><span class="small">Overall</span><b style="display:block;font-weight:600;font-size:18px">${ord(c.oAll)}<span class="small"> of ${c.n}</span></b></span></div>
    </div>
  </div>
  ${seg("period",PERIODS,S.period)}
  <div class="glass" style="overflow-x:auto;padding:6px 0"><table class="t"><thead><tr><th>Domain</th><th class="r">Points</th><th class="r">This wk</th><th class="r">Rank ${esc(p.ag)} / all</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="t"><thead><tr><th>Juggling best</th>${c.jug.map(([n])=>`<th class="r">${esc(n)}</th>`).join("")}</tr></thead><tbody><tr><td>Count</td>${c.jug.map(([,v])=>`<td class="r">${v}</td>`).join("")}</tr></tbody></table></div>
  <div class="glass pad"><h3 style="margin-bottom:10px">Trend by domain <span class="small">(last 8 weeks)</span></h3><div class="trend">${trends}</div></div>
  <div class="glass pad"><h3 style="margin-bottom:8px">Coach note</h3><textarea id="note" rows="3" placeholder="Write a note for ${esc(p.name)}'s report">${esc(c.note)}</textarea></div>
  <button class="pillbtn" data-pdf="card" data-pid="${esc(p.id)}" ${S.busy?"disabled":""}>${S.busy==="card"?"Making PDF…":"Download report PDF"}<span class="arr">${ARR}</span></button>
  ${saveLine()}`;
}

// ---------- render ----------
let lastBg="";
function setBg(k){
  if(k===lastBg)return;lastBg=k;const src="img/"+k+".jpg",bg=$("#bg");
  let img=bg.querySelector(".photo"),fill=bg.querySelector(".fill");
  if(!img){bg.innerHTML='<div class="fill"></div><img class="photo" alt="">';img=bg.querySelector(".photo");fill=bg.querySelector(".fill")}
  img.classList.add("fade");const pre=new Image();pre.onload=pre.onerror=()=>{img.src=src;fill.style.backgroundImage=`url("${src}")`;requestAnimationFrame(()=>img.classList.remove("fade"))};pre.src=src;
}
function render(){
  const v=!CONN||S.tab==="connect"?"connect":S.player!=null?"report":S.tab;setBg(BG[v]);document.body.dataset.v=v;
  const g=$(".grid-wrap"),gx=g?g.scrollLeft:0,same=render.v===v,sy=scrollY;render.v=v;
  $("#view").innerHTML=({connect:connectView,home:homeView,points:pointsView,setup:setupView,rank:rankView,downloads:downloadsView,report:reportView}[v])();
  document.querySelector("nav.tabs").style.display=v==="connect"?"none":"";document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-current",b.dataset.tab===S.tab&&S.player==null?"page":"false"));
  if(same){const g2=$(".grid-wrap");if(g2)g2.scrollLeft=gx;if(scrollY!==sy)scrollTo(0,sy)}
  showSave();
}

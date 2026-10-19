// ================= screens: black cards, lime accent, glowing ring gauges and player photos (Siva's reference UI) =================
const S={tab:"home",date:TODAY,doms:["Daily"],grp:(()=>{try{return localStorage.getItem("tt-grp")||""}catch(_){return ""}})(),setDom:"Daily",setMode:"acts",newAct:"",newMax:"",newDom:"",
  hdom:"Daily",htop:"This week",rdomain:"Overall",age:"All",period:"All time",dlPeriod:"This month",player:null,dlp:"",notes:true,np:{name:"",group:"",dob:""},sync:null,busy:""};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// big "points saved" sign after Save day: a lime tick on success, a clock when kept offline, red on failure
const TICKI='<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const WAITI='<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';
function done(kind,head,sub){const d=$("#done");d.className="done "+kind;
  d.innerHTML=`<div class="card"><span class="mark">${kind==="ok"?TICKI:kind==="wait"?WAITI:"!"}</span><b>${esc(head)}</b><span>${esc(sub)}</span></div>`;
  d.hidden=false;clearTimeout(done.h);done.h=setTimeout(()=>d.hidden=true,kind==="ok"?2600:4200)}
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3200)}
const ord=n=>n?n+(["th","st","nd","rd"][(n%100-20)%10]||["th","st","nd","rd"][n%100]||"th"):"–";
const fmtDate=d=>new Date(d+"T00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
const initials=n=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const splitName=n=>{const w=String(n).trim().split(/\s+/);return w.length>1?[w.slice(0,-1).join(" "),w.at(-1)]:["",w[0]||""]};
const firstName=n=>String(n).trim().split(/\s+/)[0]||"";
const shortGroup=g=>String(g||"").replace(/^group\s*/i,"G")||"All";
// each player gets one of Siva's cut-outs (girls' or boys' shots), always the same one for that player
const cutFor=p=>{const set=/^f/i.test(p.gender||"")?["celebrate","kick"]:["stand","header","juggle","dribble"];let h=0;for(const c of String(p.id))h=(h*31+c.charCodeAt(0))>>>0;return set[h%set.length]};
const cutImg=p=>`img/p-${cutFor(p)}.webp`;

// ---------- shared pieces ----------
const TABS=[["home","Home"],["points","Mark points"],["setup","Challenges"],["rank","Leaderboard"],["downloads","Downloads"]];
const navBtns=()=>TABS.map(([t,l])=>`<button data-tab="${t}" aria-label="${l}" title="${l}" aria-current="${t===S.tab&&S.player==null?"page":"false"}">${NAVI[t]}</button>`).join("");
const when=(date,sm,input)=>{const d=new Date(date+"T00:00");
  return `<${input?"label":"div"} class="when"><span class="wd">${d.toLocaleDateString("en-IN",{weekday:"short"})}</span><span class="dt">${d.getDate()} ${d.toLocaleDateString("en-IN",{month:"short"})}</span>${input?CALI:""}${input||""}</${input?"label":"div"}>`};
const title=(a,b,side="")=>`<div class="title"><h1>${a}<span class="lm">${b}</span></h1>${side}</div>`;
const backBtn=attr=>`<button class="back" ${attr} aria-label="Back">${BACKI}</button>`;
const chips=(label,key,opts,cur,name=x=>x,cls="")=>`<div class="chips ${cls}">${label?`<span class="lb">${label}</span>`:""}${opts.map(o=>`<button data-set="${key}" data-val="${esc(o)}" aria-pressed="${o===cur}">${esc(name(o))}</button>`).join("")}</div>`;
const stat=(v,k,cls="")=>`<div class="card stat ${cls}"><div class="v num">${esc(v)}</div><div class="k">${k}</div></div>`;
const noPlayers=()=>`<div class="card pad stack"><div class="rowx"><span class="ldot wait"></span><h3>Add your players</h3></div><span class="small">${LOADED.players||!CONN?"Bring in your football players from your sports app sheet, or add them by hand.":"Loading your players…"}</span>${LOADED.players||!CONN?`<button class="gbtn" data-go="setup" data-mode="players">Players</button>`:""}</div>`;
// two columns on a computer; on a phone the wrappers vanish and everything stacks in this order
const cols=(a,b,cls="")=>`<div class="cols ${cls}"><div class="col">${a}</div><div class="col">${b}</div></div>`;
const saveLine=()=>`<div class="saved" id="savestate"></div>`;
const PERIODS=["This week","This month","Last 3 months","All time"];
const PSHORT={"This week":"Week","This month":"Month","Last 3 months":"3 months","All time":"All time"};

function todayStats(){
  const t=(DAYS[TODAY]||{}).marks||{},marked=markedOn(TODAY);
  const touched=new Set();marked.forEach(d=>Object.entries(t[d]||{}).forEach(([id,r])=>{if(Object.keys(r||{}).length)touched.add(id)}));
  return {marked,touched:[...touched].filter(pById).length};
}
// this week's numbers for one domain: best single-day count per activity, top player, average per player
function domainWeek(d){
  const wk=range("This week"),best={},by=index();let sum=0,np=0;
  active().forEach(p=>{let s=0;((by[p.id]||{})[d]||[]).forEach(([dt,v,r])=>{if(!inR(dt,wk))return;s+=v;Object.entries(r).forEach(([k,x])=>{best[k]=Math.max(best[k]||0,+x||0)})});if(s>0){sum+=s;np++}});
  const top=rankList(d,"All",wk)[0];
  return {best,top:top&&top.s>0?top.p:null,avg:np?Math.round(sum/np*10)/10:0,sum};
}
// share of a group's players with any points this week
function groupWeek(g){
  const wk=range("This week"),ps=active().filter(p=>p.group===g),by=index();
  const done=ps.filter(p=>Object.values(by[p.id]||{}).some(rows=>rows.some(([dt])=>inR(dt,wk)))).length;
  return ps.length?Math.round(done/ps.length*100):0;
}
// glowing lime ring with a dial of ticks around it, like the reference's charging gauge; the number sits on top in HTML
const gauge=(pct,size,label)=>{const c=size/2,r=c-size*.17,sw=size*.075,C=2*Math.PI*r,on=C*Math.max(0,Math.min(pct,100))/100;
  const ticks=Array.from({length:60},(_,i)=>{const a=i/60*2*Math.PI,r1=c-2,r2=c-size*.075;return `<line x1="${(c+r1*Math.sin(a)).toFixed(1)}" y1="${(c-r1*Math.cos(a)).toFixed(1)}" x2="${(c+r2*Math.sin(a)).toFixed(1)}" y2="${(c-r2*Math.cos(a)).toFixed(1)}"/>`}).join("");
  return `<svg class="gauge" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}"><g class="ticks">${ticks}</g><circle cx="${c}" cy="${c}" r="${r}" class="track" stroke-width="${sw}"/>${pct>0?`<circle cx="${c}" cy="${c}" r="${r}" class="arc" stroke-width="${sw}" stroke-dasharray="${on.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>`:""}</svg>`};
const dial=(pct,size,big,small,label)=>`<figure class="dial" style="width:${size}px;height:${size}px">${gauge(pct,size,label)}<figcaption><b class="num" style="font-size:${Math.round(size*.19)}px">${big}</b><span>${small}</span></figcaption></figure>`;

const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
function installRow(){
  if(standalone())return "";
  if(typeof installEvt!=="undefined"&&installEvt)return `<div class="card toggle"><span>Install Talent Tracker on this device</span><button class="sw" data-act="install" aria-pressed="false">Install</button></div>`;
  if(isIOS())return `<div class="card pad small">To install: tap the Share button in Safari, then <b>Add to Home Screen</b>.</div>`;
  return "";
}

// ---------- screens ----------
function connectView(){
  if(!S.c)S.c={api:CONN?CONN.api:"",key:CONN?CONN.key:""};
  return `
  ${title("Talent ","Tracker",`<img class="ball" src="${BALL_IMG}" alt="">`)}
  <div class="card pad stack">
    <div class="rowx"><span class="ldot wait"></span><h3>Connect your Google Sheet</h3></div>
    <span class="small">Paste the Web app URL and key from your Talent Tracker Apps Script. The README in your talent-tracker repo shows where to find them.</span>
    ${S.connErr?`<div class="pit banner"><span class="ldot wait"></span><span>${esc(S.connErr)}</span></div>`:""}
    <input type="url" id="c-api" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(S.c.api)}" autocomplete="off">
    <input type="text" id="c-key" placeholder="Key" value="${esc(S.c.key)}" autocomplete="off">
    <button class="gbtn wide" data-act="connect" ${S.busy==="connect"?"disabled":""}>${S.busy==="connect"?"Connecting…":"Connect"}</button>
    ${CONN&&S.tab==="connect"?`<button class="cbtn" data-tab="home">Cancel</button>`:""}
  </div>`;
}

function homeView(){
  const st=todayStats(),n=active().length,pct=n?Math.round(st.touched/n*100):0,wk=range("This week");
  if(!CFG.domains.includes(S.hdom))S.hdom=CFG.domains[0];
  const d=S.hdom,w=domainWeek(d),all=CFG.acts[d]||[],as=(all.filter(a=>a.id in w.best).length?all.filter(a=>a.id in w.best):all).slice(0,2);
  const box=(t,v,suf)=>`<div><div class="t">${esc(t)}</div><div class="b num">${v} <span>${suf}</span></div></div>`;
  const pair=as.length>=2?as.map(a=>box(a.name,w.best[a.id]||0,"best")).join(""):box(as[0]?as[0].name:"Points",as[0]?w.best[as[0].id]||0:0,"best")+box("This week",w.sum,"pts");
  const gs=groups().slice(0,3),weekPts=active().reduce((a,p)=>a+overall(p.id,wk),0);
  const tops=rankList("Overall","All",range(S.htop)).filter(r=>r.s>0).slice(0,3),star=tops[0]?tops[0].p:active()[0];
  const trow=r=>`<button class="card trow" data-player="${esc(r.p.id)}" aria-label="${esc(r.p.name)}, ${ord(r.r)}, ${r.s} points"><img src="${cutImg(r.p)}" alt=""><span class="nm"><span class="ell">${esc(r.p.name)}</span><small>${esc([r.p.group,r.p.ag].filter(Boolean).join(" · "))}</small></span><span class="rk">#${r.r}</span><b class="num">${r.s}</b></button>`;
  return `
  <div class="hello">
    <div class="me"><span class="hi">Hello 👋 · ${esc(fmtDate(TODAY))}</span><h1>Coach Siva</h1></div>
    <button class="rbtn" data-tab="setup" aria-label="Challenges and players">${GRIDI}</button>
  </div>
  ${n?"":noPlayers()}
  ${cols(`<div class="bento">
    <div class="card frame"><div class="lime pct"><b class="num">${pct}<small>%</small></b><span>Marked today</span><em class="num">${st.touched} of ${n}</em></div></div>
    <div class="card mini"><span class="k">Players</span><b class="num">${n}</b><span class="s">${gs.length?gs.map(shortGroup).join(" · "):"active"}</span><i class="ic">${USERSI}</i></div>
    <div class="card mini"><span class="k">This week</span><b class="num">${weekPts} <small>pts</small></b><span class="s">all domains</span><i class="ic">${NAVI.rank}</i></div>
  </div>
  <div class="duo">
    <button class="card act" data-tab="rank"><i class="ic">${TROPHYI}</i><span>Leaderboard</span></button>
    <button class="key" data-go="points" aria-label="Mark points">${NAVI.points}</button>
    <button class="card act" data-tab="downloads"><i class="ic">${NAVI.downloads}</i><span>Downloads</span></button>
  </div>
  ${chips("","hdom",CFG.domains,d)}
  <div class="card fcard">${pair}
    <div class="m"><span>Top player</span><b class="ell">${w.top?esc(firstName(w.top.name)):"–"}</b></div>
    <div class="m"><span>Avg score</span><b>${w.avg||"–"}</b></div>
  </div>
  ${installRow()}`,`<div class="card glow">
    ${star?`<img src="${cutImg(star)}" alt="">`:""}
    <h2>Week progress</h2>
    <div class="rings">${gs.map((g,i)=>{const v=groupWeek(g);return dial(v,i?92:150,v+"%",esc(shortGroup(g)),`${g} marked ${v}% this week`)}).join("")||`<span class="small">Week progress shows once your players have groups.</span>`}</div>
  </div>
  ${chips("Top","htop",["This week","This month"],S.htop,x=>PSHORT[x],"sm")}
  <div class="tops">${tops.map(trow).join("")||`<div class="card empty">Top players appear once you save points.</div>`}</div>`,"home")}`;
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
      <thead><tr><th class="nm" rowspan="2">Player</th>${sel.map(d=>`<th colspan="${head(d)}" class="grp">${esc(d)}</th>`).join("")}${cnt.length?`<th rowspan="2" style="text-align:right">Total</th>`:""}</tr>
      <tr>${sel.map(d=>acts(d).length?acts(d).map(a=>`<th>${acts(d).length>1||d==="Special"?esc(a.name||"Special"):""}<b>${a.max==null?"pts":"/"+a.max}</b></th>`).join(""):`<th>No activities</th>`).join("")}</tr></thead>
      <tbody>${ps.map(p=>`<tr><td class="nm">${esc(p.name)}<small>${esc([p.group,p.ag].filter(Boolean).join(" · "))}</small></td>${sel.map(d=>{const r=(m[d]||{})[p.id]||{};
        return acts(d).length?acts(d).map(a=>{const v=r[a.id]??"";const over=a.max!=null&&+v>a.max;
          return `<td><input class="box${over?" over":""}" inputmode="numeric" data-cell="${esc(d)}|${esc(p.id)}|${esc(a.id)}" value="${esc(v)}" aria-label="${esc(p.name)} ${esc(d)} ${esc(a.name)}${a.max==null?"":" out of "+a.max}"></td>`}).join(""):`<td></td>`}).join("")}${cnt.length?`<td class="tt" data-tt="${esc(p.id)}">${rowTot(p.id)}</td>`:""}</tr>`).join("")||`<tr><td class="small" colspan="9">No players in this group.</td></tr>`}</tbody>
    </table></div>`;
  return `
  <div class="head">${backBtn('data-tab="home"')}${when(S.date,true,`<input type="date" id="date" value="${S.date}" max="${TODAY}" aria-label="Change date">`)}</div>
  ${title("Mark ","Points")}
  ${cols(`${groups().length?chips("Group","grp",[...groups(),"All"],S.grp,x=>x==="All"?"All groups":x):`<span class="small">Groups appear here after you sync or add players.</span>`}
  <div class="dgrid">${CFG.domains.map(d=>`<button data-dom="${esc(d)}" aria-pressed="${sel.includes(d)}">${esc(d)}${marked.includes(d)?'<span class="dot" aria-label="has points on this date"></span>':""}</button>`).join("")}</div>
  ${sel.includes("Special")?`<div class="card pad stack"><h3>Special challenges</h3>
    ${specials().map((x,i)=>`<div class="rowx" style="align-items:flex-end"><div style="flex:2"><span class="small">Challenge ${i+1}</span><input type="text" data-spname="${x.id}" placeholder="What was it?" value="${esc(x.name)}"></div>
      <div style="flex:1"><span class="small">Out of</span><input type="text" inputmode="numeric" data-spmax="${x.id}" placeholder="No limit" value="${x.max??""}"></div>
      ${specials().length>1?`<button class="x" data-delsp="${x.id}" aria-label="Remove challenge ${i+1}">✕</button>`:""}</div>`).join("")}
    <button class="cbtn" data-act="addsp">+ Add another special challenge</button></div>`:""}`,`<div class="card sheet">${table}${sel.some(d=>acts(d).some(a=>a.max!=null))?`<div class="hint">Red box: more than the "out of" points.</div>`:""}</div>
  <div class="savebar">${saveLine()}${sel.length&&ps.length?`<button class="gbtn${S.saved===S.date?" ok":""}" data-act="save" ${S.busy==="save"?"disabled":""}>${S.busy==="save"?"Saving…":S.saved===S.date?"Saved ✓":"Save day"}</button>`:""}</div>`,"points")}`;
}

function setupView(){
  const mode=S.setMode;
  return `
  <div class="head">${backBtn('data-tab="home"')}${when(TODAY,true)}</div>
  ${title("Chal","lenges")}
  ${chips("Edit","setMode",["acts","players"],mode,x=>x==="acts"?"Activities":"Players")}
  ${mode==="players"?playersPanel():actsPanel()}
  ${saveLine()}`;
}
function actsPanel(){
  const d=S.setDom,isSp=d==="Special",tot=isSp?null:outOf(d),list=CFG.acts[d]||[];
  return `
  ${cols(`${chips("Domain","setDom",CFG.domains,d)}
  ${isSp?`<div class="card pad"><h3>Special</h3><p class="small" style="margin:6px 0 0">Special challenges are named on the day. Select Special on Mark Points, type what the challenge was, and add more if there were several.</p></div>`:`
  <div class="card" style="padding:6px 0;border-radius:24px">
    <div class="rowx" style="padding:12px 16px"><h3 class="grow">${esc(d)}</h3><span class="small">${tot==null?"No limit":"Total /"+tot}</span></div>
    <div class="list">${list.map(a=>`<div class="rowx"><span class="grow ell" style="color:var(--text);font-weight:600">${esc(a.name)}</span><span class="or num" style="font-weight:800">${a.max==null?"–":"/"+a.max}</span><button class="x" data-delact="${esc(a.id)}" aria-label="Remove ${esc(a.name)}">✕</button></div>`).join("")||`<p class="small" style="padding:0 16px">No activities yet.</p>`}</div>
  </div>`}`,`${isSp?"":`<div class="card pad stack">
    <h3>New activity in ${esc(d)}</h3>
    <div class="rowx"><input type="text" id="newact" placeholder="Activity name" value="${esc(S.newAct)}" style="flex:2"><input type="text" inputmode="numeric" id="newmax" placeholder="Out of" value="${esc(S.newMax)}" style="flex:1"></div>
    <button class="gbtn wide" data-act="addact">Add activity</button>
  </div>`}
  <div class="card toggle"><span>Add ${esc(d)} to the overall total</span><button class="sw" data-act="counts" aria-pressed="${counts(d)}">${counts(d)?"On":"Off"}</button></div>
  <div class="card toggle"><input type="text" id="newdom" placeholder="New domain, e.g. Passing" value="${esc(S.newDom)}" style="background:transparent;box-shadow:none;padding:6px 0"><button class="cbtn" data-act="adddom">Add</button></div>`,"setup")}`;
}
function playersPanel(){
  const on=p=>p.active!==false&&!p.hidden;const all=[...PLAYERS].sort((a,b)=>on(b)-on(a)||a.name.localeCompare(b.name));
  const st=S.sync;
  return `
  ${cols(`<div class="card pad stack">
    <div class="rowx"><span class="back" style="width:42px;height:42px;color:var(--lime)">${SYNCI}</span><div class="grow"><h3>From your sports app</h3><span class="small">${SYNCINFO?`Last read ${new Date(SYNCINFO.at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})} · ${SYNCINFO.count} players`:"Not synced yet"}</span></div></div>
    <span class="small">The app reads football players straight from the Players tab each time it opens: name, admission number, group, gender and date of birth only. Contacts, medical notes and fees are never read.</span>
    ${st?`<div class="pit banner"><span class="ldot ${st.kind==="err"?"wait":""}"></span><span>${esc(st.msg)}</span></div>`:""}
    <button class="gbtn wide" data-act="sync" ${S.busy==="sync"?"disabled":""}>${S.busy==="sync"?"Reading…":"Refresh players"}</button>
  </div>
  <div class="card pad stack">
    <h3>Add a player by hand</h3>
    <input type="text" id="np-name" placeholder="Player name" value="${esc(S.np.name)}">
    <div class="rowx"><input type="text" id="np-group" placeholder="Group" value="${esc(S.np.group)}" list="grouplist" style="flex:1"><input type="date" id="np-dob" value="${esc(S.np.dob)}" aria-label="Date of birth" style="flex:1"></div>
    <datalist id="grouplist">${groups().map(g=>`<option value="${esc(g)}">`).join("")}</datalist>
    <button class="cbtn" data-act="addplayer">+ Add player</button>
  </div>
  <div class="card toggle"><span class="small" style="min-width:0">Connected to your Google Sheet</span><button class="cbtn mini" data-act="disconnect">Change</button></div>`,`<div class="card list" style="padding:4px 0;border-radius:24px">${all.map(p=>`<div class="rowx"><span class="av" style="width:34px;height:34px;font-size:12px">${esc(initials(p.name))}</span><span class="grow"><span class="ell" style="color:var(--text);font-weight:600">${esc(p.name)}</span><span class="small">${esc([p.group,p.ag,p.adm?"#"+p.adm:""].filter(Boolean).join(" · "))}</span></span>${p.active===false?'<span class="small">Inactive</span>':`<button class="sw" data-hide="${esc(p.id)}" aria-pressed="${!p.hidden}" aria-label="Show ${esc(p.name)} in the app">${!p.hidden?"On":"Off"}</button>`}</div>`).join("")||`<div class="empty">${LOADED.players||!CONN?"No players yet.":"Loading…"}</div>`}</div>`,"setup")}`;
}

function rankView(){
  const rg=range(S.period),list=rankList(S.rdomain,S.age,rg);const [a,b,c]=list;
  const pod=(r,cls)=>r?`<button class="pod ${cls}" data-player="${esc(r.p.id)}" aria-label="${ord(r.r)}: ${esc(r.p.name)}, ${r.s} points"><span class="no">${r.r}</span><img src="${cutImg(r.p)}" alt=""><span class="foot"><b>${esc(firstName(r.p.name))}</b><span class="num">${r.s}</span></span></button>`:`<span></span>`;
  return `
  ${title("Leader","board")}
  ${chips("This","period",PERIODS,S.period,x=>PSHORT[x])}
  ${cols(list.length?`<div class="podium">${pod(b,"second")}${pod(a,"first")}${pod(c,"third")}</div>`:noPlayers(),`${list.length?`<div class="card ranks">${list.slice(3).map(r=>`<button class="row" data-player="${esc(r.p.id)}"><span class="n">${r.r}</span><span class="nm"><span class="ell">${esc(r.p.name)}</span><small>${esc([r.p.ag,r.p.group].filter(Boolean).join(" · "))}</small></span><span class="s or num">${r.s}</span></button>`).join("")||`<div class="empty">Only three players here.</div>`}</div>`:""}
  <div class="filters" aria-label="Domain">${["Overall",...domainsWithData()].map(x=>`<button data-set="rdomain" data-val="${esc(x)}" aria-pressed="${x===S.rdomain}">${esc(x)}</button>`).join("")}</div>
  <div class="filters" aria-label="Age group">${["All",...ageGroups()].map(x=>`<button data-set="age" data-val="${esc(x)}" aria-pressed="${x===S.age}">${esc(x==="All"?"All ages":x)}</button>`).join("")}</div>`,"rank")}`;
}

function downloadsView(){
  const ps=active();if(!S.dlp&&ps[0])S.dlp=ps[0].id;const dp=pById(S.dlp);
  const tile=(n,t,kind)=>`<button class="tile card" data-pdf="${kind}" aria-label="Download ${t.replace("<br>"," ")} PDF" ${S.busy?"disabled":""}><span class="no">${n}</span><span class="t">${t}</span><span class="dl">${S.busy===kind?"…":DLI("#111")}</span></button>`;
  return `
  ${title("Down","loads",`<img class="ball" src="${BALL_IMG}" alt="">`)}
  ${chips("Period","dlPeriod",PERIODS,S.dlPeriod,x=>PSHORT[x])}
  <div class="dtiles">
    <button class="tile wide lime" data-pdf="card" aria-label="Download report card PDF${dp?" for "+esc(dp.name):""}" ${ps.length&&!S.busy?"":"disabled"}>
      ${dp?`<img src="${cutImg(dp)}" alt="">`:""}
      <span class="sub">One PDF per player</span>
      <span class="big">PLAYER<br>REPORT CARDS</span>
      <span class="dl">${S.busy==="card"?"…":DLI("#C8F23D")}</span>
    </button>
    <div class="card pad stack pick">
      <select id="dlplayer" aria-label="Player for the report card">${ps.map(p=>`<option value="${esc(p.id)}" ${S.dlp===p.id?"selected":""}>${esc(p.name)} · ${esc(p.ag)}</option>`).join("")||"<option>No players yet</option>"}</select>
      <button class="cbtn" data-act="preview" ${ps.length?"":"disabled"}>Preview report card</button>
    </div>
    ${tile("01","Overall<br>ranking","overall")}
    ${tile("02","Age<br>groups","age")}
    ${tile("03","Domain<br>ranking","domains")}
    ${tile("04","Day<br>sheets","days")}
  </div>
  <div class="card toggle"><span>Include coach notes</span><button class="sw" data-act="note" aria-pressed="${S.notes}">${S.notes?"On":"Off"}</button></div>`;
}

function spark(vals){
  const w=160,h=56,pad=6,mx=Math.max(...vals,1),mn=Math.min(...vals,0),span=mx-mn||1;
  const pts=vals.map((v,i)=>[pad+i*(w-2*pad)/(vals.length-1),h-pad-(v-mn)/span*(h-2*pad)]);
  const d=pts.map((q,i)=>(i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join(" ");const l=pts.at(-1);
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Weekly points ${vals.join(", ")}"><path d="${d} L${l[0].toFixed(1)} ${h-pad} L${pad} ${h-pad} Z" fill="rgba(200,242,61,.14)"/><path d="${d}" fill="none" stroke="#C8F23D" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="3.5" fill="#C8F23D"/></svg>`;
}
function monthTotal(pid,offset){const d=new Date(TODAY+"T00:00");d.setDate(1);d.setMonth(d.getMonth()+offset);const a=iso(d);d.setMonth(d.getMonth()+1);d.setDate(0);return overall(pid,[a,iso(d)])}
function cardData(pid,period){
  const p=pById(pid),rg=range(period),wk=range("This week"),all=active(),n=all.length;
  const has=overall(pid,rg)>0,oAge=has?rankOf(pid,"Overall",p.ag,rg):0,oAll=has?rankOf(pid,"Overall","All",rg):0,nAge=all.filter(x=>x.ag===p.ag).length;
  const ahead=n>1?Math.round(all.filter(x=>overall(x.id,rg)<overall(pid,rg)).length/(n-1)*100):0;
  const doms=domainsWithData().map(d=>{const w=weekly(pid,d),pts=score(pid,d,rg);return {d,pts,week:score(pid,d,wk),best:Math.max(...w),rAge:pts?rankOf(pid,d,p.ag,rg):0,rAll:pts?rankOf(pid,d,"All",rg):0,w,counts:counts(d)}});
  const days=new Set();Object.values(index()[pid]||{}).forEach(rows=>rows.forEach(([dt])=>{if(inR(dt,rg))days.add(dt)}));
  const cur=monthTotal(pid,0),prev=monthTotal(pid,-1),change=prev?Math.round((cur-prev)/prev*100):null;
  return {p,period,rg,oAge,oAll,n,nAge,ahead,total:overall(pid,rg),doms,days:days.size,cur,change,jug:jugBest(pid,rg),note:NOTES[pid]||""};
}
function reportView(){
  const p=pById(S.player);if(!p){S.player=null;return homeView()}
  const c=cardData(p.id,S.period),mx=Math.max(1,...c.doms.map(x=>x.pts)),[first,sur]=splitName(p.name);
  const rows=c.doms.map(x=>`<tr><td>${esc(x.d)}${x.counts?"":' <span class="small">(not in total)</span>'}</td><td class="r">${x.pts}</td><td class="r">${x.week}</td><td class="r">${ord(x.rAge)} / ${ord(x.rAll)}</td></tr>`).join("");
  const trends=c.doms.map(x=>{const ch=x.w.at(-1)-x.w.at(-2);return `<figure class="pit"><figcaption><span>${esc(x.d)}</span><span class="${ch>=0?"or":"rd"}">${ch>=0?"+":""}${ch}</span></figcaption>${spark(x.w)}</figure>`}).join("");
  const chg=c.change==null?(c.cur?"New":"–"):(c.change>=0?"+":"")+c.change+"%";
  return `
  <div class="head">${backBtn('data-act="back"')}<button class="gbtn sm" data-pdf="card" data-pid="${esc(p.id)}" ${S.busy?"disabled":""}>${S.busy==="card"?"Making PDF…":"PDF report"}</button></div>
  ${cols(`<div class="hero">
    <img src="${cutImg(p)}" alt="">
    ${dial(c.ahead,118,c.ahead+"%","ahead",`Ahead of ${c.ahead}% of players`)}
    <div class="cap">Report card</div>
    <div class="name">${first?esc(first)+"<br>":""}${esc(sur)}</div>
    <div class="tags"><span>${c.oAge?"#"+c.oAge+" in ":""}${esc(p.ag)}</span>${p.group?`<span>${esc(p.group)}</span>`:""}</div>
  </div>
  <div class="tiles three">
    ${stat(String(c.total),"Total pts","lime")}
    ${stat(String(c.days),"Days")}
    ${stat(chg,"vs last month")}
  </div>
  ${chips("Period","period",PERIODS,S.period,x=>PSHORT[x],"sm")}
  <div class="card doms">
    <div class="lbl">Domains<small>${esc(S.period.toLowerCase())}</small></div>
    ${c.doms.map(x=>`<div class="dom"><span>${esc(x.d)}</span><div class="tr pit"><i style="width:${Math.round(x.pts/mx*100)}%"></i></div><span class="num">${x.pts}</span></div>`).join("")}
  </div>
  `,`<div class="pit note"><label for="note" class="or">Coach note</label><textarea id="note" rows="2" placeholder="Write a note for ${esc(firstName(p.name))}'s report">${esc(c.note)}</textarea></div>
  ${saveLine()}
  <div class="card" style="overflow-x:auto;padding:6px 0;border-radius:24px"><table class="t"><thead><tr><th>Ranks</th><th class="r">Points</th><th class="r">This wk</th><th class="r">${esc(p.ag)} / all</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="t"><thead><tr><th>Juggling best</th>${c.jug.map(([n])=>`<th class="r">${esc(n)}</th>`).join("")}</tr></thead><tbody><tr><td>Count</td>${c.jug.map(([,v])=>`<td class="r">${v}</td>`).join("")}</tr></tbody></table></div>
  <div class="card pad" style="border-radius:24px"><div class="lbl" style="margin-bottom:12px">Trend<small>last 8 weeks</small></div><div class="trend">${trends}</div></div>
  <div class="small">Ahead of ${c.ahead}% of players · ${ord(c.oAll)} of ${c.n} overall</div>`,"report")}`;
}

// ---------- render ----------
function render(){
  const v=!CONN||S.tab==="connect"?"connect":S.player!=null?"report":S.tab;document.body.dataset.v=v;
  const g=$(".grid-wrap"),gx=g?g.scrollLeft:0,same=render.v===v,sy=scrollY;render.v=v;
  $("#view").innerHTML=({connect:connectView,home:homeView,points:pointsView,setup:setupView,rank:rankView,downloads:downloadsView,report:reportView}[v])();
  $("#tabs").innerHTML=navBtns();document.querySelector("nav.tabs").style.display=v==="connect"?"none":"";
  if(same){const g2=$(".grid-wrap");if(g2)g2.scrollLeft=gx;if(scrollY!==sy)scrollTo(0,sy)}
  showSave();
}

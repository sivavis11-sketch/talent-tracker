// ================= players + connection =================
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Could not load "+src));document.head.appendChild(s)})}
const playerBody=p=>({name:p.name,adm:p.adm||"",group:p.group||"",gender:p.gender||"",dob:p.dob||"",active:p.active!==false,hidden:!!p.hidden,source:p.source||"manual"});
function syncMsg(kind,msg){S.sync={kind,msg};renderSoon()}
async function syncPlayers(){
  if(S.busy)return;S.busy="sync";syncMsg("ok","Reading the Players tab from your sports app sheet…");
  try{lastSig="";await loadAll();syncMsg("ok",`Done. ${active().length} football players are in the app.`)}
  catch(e){syncMsg("err",connProblem(e))}
  finally{S.busy="";renderSoon()}
}
async function connect(){
  const api=(document.getElementById("c-api")||{}).value||"",key=(document.getElementById("c-key")||{}).value||"";
  if(!/^https:\/\/script\.google(usercontent)?\.com\//.test(api.trim()))return toast("Paste the Web app URL from Apps Script. It starts with https://script.google.com/");
  if(!key.trim())return toast("Type the key from your Apps Script.");
  const prev=CONN;CONN={api:api.trim(),key:key.trim()};S.busy="connect";render();
  try{await api_ping();ls.set(CONN_KEY,CONN);S.busy="";toast("Connected to your sheet.");startStore();S.tab="home";render()}
  catch(e){CONN=prev;S.busy="";S.connErr=connProblem(e);render()}
}
const api_ping=()=>api("ping");
// install prompt (Android / desktop Chrome); iPhone uses Share > Add to Home Screen
let installEvt=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;if(S.tab==="home")renderSoon()});
addEventListener("appinstalled",()=>{installEvt=null;toast("Talent Tracker is installed.");renderSoon()});

// ================= PDF reports =================
async function pdfLib(){
  if(!window.jspdf)await loadScript(LIB.jspdf);
  if(!window.jspdf.jsPDF.API.autoTable)await loadScript(LIB.auto);
  return window.jspdf.jsPDF;
}
async function pngData(src){
  const cache=pngData.c=pngData.c||{};if(src in cache)return cache[src];
  try{const b=await (await fetch(src)).blob();cache[src]=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>r(null);f.readAsDataURL(b)})}catch(_){cache[src]=null}
  return cache[src];
}
const CHAR=[43,43,43],GHOST=[58,58,58],RED=[239,62,54],ORANGE=[240,88,43],PURPLE=[142,45,116],INK=[30,30,30],MUTE=[120,120,120],TINT=[246,243,242];
const alpha=(doc,o)=>doc.setGState(new doc.GState({opacity:o,"stroke-opacity":o}));
// dark header for the list reports: ghost word, orange eyebrow, red→purple strip
function pdfHeader(doc,eyebrow,title,sub){
  const W=doc.internal.pageSize.getWidth(),H=46;
  doc.setFillColor(...CHAR);doc.rect(0,0,W,H,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(78);doc.setTextColor(...GHOST);doc.text(title.split(" ")[0].toUpperCase(),W-8,H-3,{align:"right"});
  [RED,[201,58,85],PURPLE].forEach((c,i)=>{doc.setFillColor(...c);doc.rect(i*W/3,H-2.5,W/3+.2,2.5,"F")});
  doc.setTextColor(249,162,59);doc.setFontSize(8.5);doc.text(eyebrow.toUpperCase(),14,15,{charSpace:1.2});
  doc.setTextColor(255,255,255);doc.setFontSize(22);doc.text(doc.splitTextToSize(title,130),14,27);
  doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(207,207,207);doc.text(sub,14,H-8);
  return H+10;
}
// report card header, as on the app's report card: red→purple card with the player's name and cut-out, then three stat tiles
async function cardHeader(doc,c,PL){
  const W=doc.internal.pageSize.getWidth(),H=112,p=c.p,[first,sur]=splitName(p.name),x0=14,y0=12,cw=W-28,ch=62;
  doc.setFillColor(...CHAR);doc.rect(0,0,W,H,"F");
  doc.saveGraphicsState();doc.roundedRect(x0,y0,cw,ch,7,7,null);doc.clip();doc.discardPath();
  const g=[[239,62,54],[201,58,85],[142,45,116]];for(let i=0;i<40;i++){const t=i/39,k=t<.55?t/.55:(t-.55)/.45,[a,b]=t<.55?[g[0],g[1]]:[g[1],g[2]];doc.setFillColor(...a.map((v,j)=>Math.round(v+(b[j]-v)*k)));doc.rect(x0,y0+i*ch/40,cw,ch/40+.3,"F")}
  alpha(doc,.12);doc.setFont("helvetica","bold");doc.setFontSize(110);doc.setTextColor(255,255,255);doc.text("#"+(c.oAge||"-"),x0+cw-4,y0+36,{align:"right"});alpha(doc,1);
  const img=await pngData("img/pdf-"+(/^f/i.test(p.gender||"")?"kick":"stand")+".png");
  if(img){const ip=doc.getImageProperties(img),ih=ch+12,iw=ih*ip.width/ip.height;doc.addImage(img,"PNG",x0+cw-iw-8,y0+4,iw,ih)}
  doc.restoreGraphicsState();
  doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(255,210,122);doc.text("Report card  ·  "+PL,x0+8,y0+10);
  doc.setFont("helvetica","bolditalic");doc.setTextColor(255,255,255);let fs=30;doc.setFontSize(fs);while(fs>16&&Math.max(doc.getTextWidth(first.toUpperCase()),doc.getTextWidth(sur.toUpperCase()))>cw*.55){fs-=2;doc.setFontSize(fs)}
  doc.text([first,sur].filter(Boolean).map(x=>x.toUpperCase()),x0+8,y0+24,{lineHeightFactor:1});
  doc.setFont("helvetica","bold");doc.setFontSize(8.5);let tx=x0+8;[(c.oAge?"#"+c.oAge+" in ":"")+p.ag,p.group].filter(Boolean).forEach(t=>{const tw=doc.getTextWidth(t)+8;alpha(doc,.25);doc.setFillColor(0,0,0);doc.roundedRect(tx,y0+ch-14,tw,7,3.5,3.5,"F");alpha(doc,1);doc.setTextColor(255,255,255);doc.text(t,tx+4,y0+ch-9.2);tx+=tw+3});
  const chg=c.change==null?(c.cur?"New":"-"):(c.change>=0?"+":"")+c.change+"%",bw=(cw-8)/3;
  [[String(c.total),"Total pts",[249,162,59]],[String(c.days),"Days",[239,62,54]],[chg,"vs last month",[249,162,59]]].forEach(([v,k,col],i)=>{const x=x0+i*(bw+4),y=y0+ch+6;
    doc.setFillColor(39,39,39);doc.roundedRect(x,y,bw,24,5,5,"F");doc.setFont("helvetica","bold");doc.setFontSize(30);doc.setTextColor(...GHOST);doc.text(v,x+3,y+15);
    doc.setFontSize(18);doc.setTextColor(...col);doc.text(v,x+5,y+13);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(140,140,140);doc.text(k,x+5,y+20)});
  return H+10;
}
function pdfFooters(doc){
  const n=doc.getNumberOfPages(),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(...MUTE);doc.text("Talent Tracker · Coach Siva · "+new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),14,H-8);doc.text(i+" / "+n,W-14,H-8,{align:"right"})}
}
const tbl=(doc,y,head,body,opt={})=>{doc.autoTable({startY:y,head:[head],body,theme:"plain",margin:{left:14,right:14},
  styles:{font:"helvetica",fontSize:9,textColor:INK,cellPadding:{top:2.2,bottom:2.2,left:3,right:3}},headStyles:{fillColor:CHAR,textColor:255,fontStyle:"bold",fontSize:8.5},
  alternateRowStyles:{fillColor:TINT},...opt});return doc.lastAutoTable.finalY};
function section(doc,y,t){const H=doc.internal.pageSize.getHeight();if(y>H-40){doc.addPage();y=20}doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(...INK);doc.text(t,14,y);doc.setDrawColor(...RED);doc.setLineWidth(.8);doc.line(14,y+2,26,y+2);return y+7}
const periodLabel=p=>{const [a,b]=range(p);return p==="All time"?"All time":`${p} · ${fmtDate(a)} – ${fmtDate(b)}`};

async function buildPdf(kind,pid){
  const J=await pdfLib(),doc=new J({unit:"mm",format:"a4"}),W=doc.internal.pageSize.getWidth();
  const period=kind==="card"&&S.player!=null?S.period:S.dlPeriod,rg=range(period),doms=domainsWithData(),PL=periodLabel(period);
  let y,file;
  if(kind==="card"){
    const c=cardData(pid,period),p=c.p;
    y=await cardHeader(doc,c,PL);
    doc.setFont("helvetica","bold");doc.setFontSize(10.5);doc.setTextColor(...INK);doc.text(`Ahead of ${c.ahead}% of players`,14,y);
    doc.setFont("helvetica","normal");doc.setTextColor(...MUTE);doc.text([p.adm?"Adm. "+p.adm:"",p.gender||""].filter(Boolean).join("  ·  "),W-14,y,{align:"right"});
    y=section(doc,y+10,"Scores and ranks by domain");
    y=tbl(doc,y,["Domain","Points","This week","Best week","Rank in "+p.ag,"Rank of all"],c.doms.map(x=>[x.d+(x.counts?"":" *"),x.pts,x.week,x.best,ord(x.rAge),ord(x.rAll)]),{columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"},4:{halign:"right"},5:{halign:"right"}}});
    if(c.doms.some(x=>!x.counts)){doc.setFontSize(7.5);doc.setTextColor(...MUTE);doc.text("* not added to the overall total",14,y+4.5);y+=4}
    y=section(doc,y+10,"Juggling best counts");
    y=tbl(doc,y,c.jug.map(([n])=>n),[c.jug.map(([,v])=>v)],{styles:{halign:"center",fontSize:11,textColor:INK}});
    y=section(doc,y+10,"Trend by domain (last 8 weeks)");
    const cw=(W-28-8)/3,ch=30;
    c.doms.forEach((x,i)=>{const col=i%3;if(col===0&&i){y+=ch+4}if(y+ch>doc.internal.pageSize.getHeight()-16){doc.addPage();y=20}
      const x0=14+col*(cw+4);doc.setFillColor(...TINT);doc.roundedRect(x0,y,cw,ch,3,3,"F");doc.setFontSize(8.5);doc.setTextColor(...INK);doc.text(x.d,x0+4,y+6);
      const ch2=x.w.at(-1)-x.w.at(-2);doc.setTextColor(...(ch2>=0?[30,150,60]:[200,60,50]));doc.text((ch2>=0?"+":"")+ch2,x0+cw-4,y+6,{align:"right"});
      const mx=Math.max(...x.w,1),px=i2=>x0+5+i2*(cw-10)/(x.w.length-1),py=v=>y+ch-5-(v/mx)*(ch-15);
      doc.setDrawColor(...ORANGE);doc.setLineWidth(.7);for(let k=1;k<x.w.length;k++)doc.line(px(k-1),py(x.w[k-1]),px(k),py(x.w[k]));
      doc.setFillColor(...RED);doc.circle(px(x.w.length-1),py(x.w.at(-1)),1.2,"F")});
    y+=ch+4;
    if(S.notes&&c.note){y=section(doc,y+8,"Coach note");doc.setFontSize(10);doc.setTextColor(...INK);const lines=doc.splitTextToSize(c.note,W-36);
      doc.setFillColor(...TINT);doc.roundedRect(14,y,W-28,lines.length*5+8,3,3,"F");doc.text(lines,18,y+7)}
    file=`${p.name} report card.pdf`;
  }else if(kind==="overall"){
    y=pdfHeader(doc,"Overall leaderboard","Academy rankings",PL);
    const list=rankList("Overall","All",rg);
    tbl(doc,y,["#","Player","Age","Group","Overall",...doms],list.map(r=>[r.r,r.p.name,r.p.ag,r.p.group||"",r.s,...doms.map(d=>score(r.p.id,d,rg))]),{styles:{fontSize:doms.length>6?7.5:9},columnStyles:{4:{fontStyle:"bold"}}});
    file="Overall leaderboard.pdf";
  }else if(kind==="age"){
    y=pdfHeader(doc,"Leaderboard by age group","Age group rankings",PL);
    ageGroups().forEach(ag=>{y=section(doc,y+2,ag);y=tbl(doc,y,["#","Player","Group","Overall",...doms],rankList("Overall",ag,rg).map(r=>[r.r,r.p.name,r.p.group||"",r.s,...doms.map(d=>score(r.p.id,d,rg))]),{styles:{fontSize:doms.length>6?7.5:9}})+8});
    file="Leaderboard by age group.pdf";
  }else if(kind==="domains"){
    y=pdfHeader(doc,"Domain rankings","Who leads each domain",PL);
    doms.forEach((d,i)=>{if(i){doc.addPage();y=20}y=section(doc,y,d+(counts(d)?"":" (not in overall total)"));
      tbl(doc,y,["#","Player","Age","Group","Points","Rank in age group"],rankList(d,"All",rg).map(r=>[r.r,r.p.name,r.p.ag,r.p.group||"",r.s,ord(rankOf(r.p.id,d,r.p.ag,rg))]))});
    file="Domain rankings.pdf";
  }else{
    y=pdfHeader(doc,"Day sheets","Points by date",PL);
    const dates=Object.keys(DAYS).filter(d=>inR(d,rg)&&markedOn(d).length).sort();
    if(!dates.length){doc.setFontSize(11);doc.setTextColor(...INK);doc.text("No points saved in this period.",14,y+6)}
    dates.forEach(dt=>{y=section(doc,y+4,fmtDate(dt)+" "+dt.slice(0,4));const day=DAYS[dt];
      markedOn(dt).forEach(d=>{const as=d==="Special"?(day.specials||[]):(CFG.acts[d]||[]);const m=day.marks[d]||{};
        const ids=new Set(as.map(a=>a.id));Object.values(m).forEach(r=>Object.keys(r||{}).forEach(k=>{if(!ids.has(k)){ids.add(k);as.push({id:k,name:"(removed)"})}}));
        const rows=active().filter(p=>m[p.id]&&Object.keys(m[p.id]).length).map(p=>[p.name,...as.map(a=>m[p.id][a.id]??""),sumRow(m[p.id])]);
        doc.setFontSize(9.5);doc.setTextColor(...RED);doc.text(d,14,y+1);
        y=tbl(doc,y+3,["Player",...as.map(a=>(a.name||"Special")+(a.max!=null?" /"+a.max:"")),"Total"],rows,{styles:{fontSize:as.length>6?7:8.5},columnStyles:{0:{cellWidth:34}}})+6})});
    file="Day sheets.pdf";
  }
  pdfFooters(doc);
  return {doc,file};
}
async function makePdf(kind,pid){
  if(S.busy)return;if(!active().length)return toast("Add players first.");
  S.busy=kind;render();
  try{
    const {doc,file}=await buildPdf(kind,pid||S.dlp);const blob=doc.output("blob");
    const f=typeof File==="function"?new File([blob],file,{type:"application/pdf"}):null;
    if(f&&matchMedia("(pointer:coarse)").matches&&navigator.canShare&&navigator.canShare({files:[f]})){
      try{await navigator.share({files:[f],title:file})}catch(e){if(e&&e.name!=="AbortError")doc.save(file)}}
    else{doc.save(file);toast("Downloading "+file)}
  }catch(e){toast("Couldn't make the PDF: "+(e&&e.message||"unknown problem"))}
  finally{S.busy="";render()}
}

// ================= events =================
document.addEventListener("click",e=>{
  // the date sits under an invisible date field; computers don't open its calendar on a plain click, so open it ourselves
  const wd=e.target.closest(".when");const di=wd&&wd.querySelector("input[type=date]");if(di&&di.showPicker){try{di.showPicker()}catch(_){}}
  const b=e.target.closest("button");if(!b||b.disabled)return;const d=b.dataset;
  if((d.tab==="points"||d.go==="points")&&S.tab!=="points"){TODAY=iso(new Date());openPoints(TODAY)}
  if(d.tab){S.tab=d.tab;S.player=null;render();scrollTo(0,0);return}
  if(d.go){S.player=null;S.tab=d.go;if(d.mode)S.setMode=d.mode;if(d.pick&&!S.doms.includes(d.pick))S.doms=[...S.doms,d.pick];render();scrollTo(0,0);return}
  if(d.set){S[d.set]=d.val;if(d.set==="grp"){try{localStorage.setItem("tt-grp",d.val)}catch(_){}}render();return}
  if(d.dom){const x=d.dom;S.doms=S.doms.includes(x)?S.doms.filter(y=>y!==x):[...S.doms,x];render();return}
  if(d.player){S.player=d.player;render();scrollTo(0,0);return}
  if(d.pdf){makePdf(d.pdf,d.pid);return}
  if(d.hide){const p=pById(d.hide);if(!p)return;if(p.active===false)return toast(p.name+" is marked inactive in your sports app.");p.hidden=!p.hidden;bump();write("players/"+p.id,playerBody(p));render();return}
  if(d.delact){const n=(CFG.acts[S.setDom]||[]).find(a=>a.id===d.delact);CFG.acts[S.setDom]=(CFG.acts[S.setDom]||[]).filter(a=>a.id!==d.delact);saveCfg();toast(`Removed ${n?n.name:"activity"}. Points already given stay in the totals.`);render();return}
  if(d.delsp){const day=dayOf(S.date);day.specials=specials().filter(x=>x.id!==d.delsp);Object.values(day.marks.Special||{}).forEach(r=>delete r[d.delsp]);bump();queueDay(S.date,300);render();return}
  const a=d.act;
  if(a==="back"){S.player=null;render();return}
  if(a==="note"){S.notes=!S.notes;render();return}
  if(a==="sync"){syncPlayers();return}
  if(a==="connect"){connect();return}
  if(a==="disconnect"){S.tab="connect";S.player=null;render();return}
  if(a==="install"){if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;render()})}return}
  if(a==="focusadd"){const n=document.getElementById("newact");if(n){n.focus();n.scrollIntoView({block:"center"})}return}
  if(a==="preview"){if(S.dlp){S.player=S.dlp;S.period=S.dlPeriod;render();scrollTo(0,0)}return}
  if(a==="addsp"){specials().push({id:"s"+uid(),name:"",max:null});render();const ins=document.querySelectorAll("[data-spname]");if(ins.length)ins[ins.length-1].focus();return}
  if(a==="counts"){const x=S.setDom;CFG.nototal=counts(x)?[...CFG.nototal,x]:CFG.nototal.filter(y=>y!==x);bump();saveCfg();render();return}
  if(a==="addact"){const n=S.newAct.trim(),m=parseInt(S.newMax,10);if(!n)return toast("Type the activity name.");
    (CFG.acts[S.setDom]=CFG.acts[S.setDom]||[]).push({id:"a"+uid(),name:n,max:isNaN(m)?null:m});S.newAct="";S.newMax="";saveCfg();toast(`Added ${n} to ${S.setDom}.`);render();return}
  if(a==="adddom"){const n=S.newDom.trim();if(!n)return toast("Type a name for the domain.");
    if(!CFG.domains.some(x=>x.toLowerCase()===n.toLowerCase())){const i=CFG.domains.indexOf("Special");CFG.domains.splice(i<0?CFG.domains.length:i,0,n);CFG.acts[n]=[];saveCfg()}
    S.setDom=CFG.domains.find(x=>x.toLowerCase()===n.toLowerCase());S.newDom="";toast(`Added ${S.setDom}. Now add its activities.`);render();return}
  if(a==="addplayer"){const n=S.np.name.trim();if(!n)return toast("Type the player's name.");
    const p={id:"m-"+uid(),name:n,group:S.np.group.trim(),dob:S.np.dob,active:true,source:"manual"};PLAYERS.push({...p,ag:ageGroup(p.dob)});bump();write("players/"+p.id,playerBody(p));
    S.np={name:"",group:S.np.group,dob:""};toast(`Added ${n}.`);render();return}
  if(a==="save"){if(S.busy)return;
    const m=dayOf(S.date).marks,ids=new Set();S.doms.forEach(x=>Object.entries(m[x]||{}).forEach(([id,r])=>{if(Object.keys(r||{}).length)ids.add(id)}));
    const over=document.querySelectorAll(".grid .box.over").length;
    if(!ids.size)return toast("Type points for at least one player.");
    const date=S.date,who=`${ids.size} player${ids.size>1?"s":""} · ${fmtDate(date)}`,warn=over?` · ${over} above the set points`:"";
    S.busy="save";S.saved=null;render();flushDay(date);
    // wait until the sheet has really taken this day (write() may only queue it behind another save)
    const t0=Date.now();(function chk(){
      const left=!!OUTBOX["days/"+date],res=!left?(saveErr?"err":"ok"):!online?"wait":saveErr&&!draining?"err":Date.now()-t0>20000?"slow":null;
      if(!res)return setTimeout(chk,150);
      S.busy="";if(res==="ok")S.saved=date;render();
      if(res==="ok")done("ok","Points saved",who+warn);
      else if(res==="wait")done("wait","Saved on this phone","No signal now. It goes to your sheet when you're back online.");
      else if(res==="slow")done("wait","Still saving…","Your sheet is slow to answer. Keep the app open for a moment.");
      else done("err","Not saved",saveErr||"Your sheet didn't answer. Tap Save day again.");
    })();return}
});
document.addEventListener("input",e=>{const t=e.target;
  if(t.dataset.cell){S.saved=null;const sb=document.querySelector('[data-act=save]');if(sb&&!S.busy){sb.classList.remove("ok");sb.textContent="Save day"}const [dm,pid,aid]=t.dataset.cell.split("|");const v=t.value.replace(/\D/g,"").slice(0,6);if(v!==t.value)t.value=v;
    const m=dayOf(S.date).marks,dd=(m[dm]=m[dm]||{});dd[pid]=dd[pid]||{};if(v==="")delete dd[pid][aid];else dd[pid][aid]=+v;if(!Object.keys(dd[pid]).length)delete dd[pid];
    const a=acts(dm).find(x=>x.id===aid);t.classList.toggle("over",!!a&&a.max!=null&&+v>a.max);bump();queueDay(S.date);
    const tt=document.querySelector(`[data-tt="${CSS.escape(pid)}"]`);if(tt)tt.textContent=S.doms.filter(x=>CFG.domains.includes(x)&&counts(x)).reduce((s,x)=>s+sumRow((m[x]||{})[pid]),0);return}
  if(t.id==="newact")S.newAct=t.value;
  if(t.id==="newmax")S.newMax=t.value;
  if(t.id==="newdom")S.newDom=t.value;
  if(t.id==="np-name")S.np.name=t.value;
  if(t.id==="c-api"||t.id==="c-key"){S.c=S.c||{api:"",key:""};S.c[t.id==="c-api"?"api":"key"]=t.value}
  if(t.id==="np-group")S.np.group=t.value;
});
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="date"&&t.value){openPoints(t.value);render();return}
  if(t.id==="np-dob")S.np.dob=t.value;
  if(t.id==="dlplayer")S.dlp=t.value;
  if(t.id==="note"&&S.player){NOTES[S.player]=t.value;write("notes/"+S.player,{text:t.value.slice(0,4000)});return}
  if(t.dataset.spname!=null){const x=specials().find(s=>s.id===t.dataset.spname);if(x){x.name=t.value.trim();queueDay(S.date,300);render()}}
  if(t.dataset.spmax!=null){const x=specials().find(s=>s.id===t.dataset.spmax);if(x){const v=parseInt(t.value,10);x.max=isNaN(v)?null:v;queueDay(S.date,300);render()}}
});
addEventListener("pagehide",()=>{if(dirty.size)flushAll()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&iso(new Date())!==TODAY){const was=TODAY;TODAY=iso(new Date());if(S.tab==="points"&&S.date===was)openPoints(TODAY);render()}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&dirty.size)flushAll()});

// ================= start =================
if("serviceWorker" in navigator&&location.protocol==="https:"){
  // when an update replaces an older copy of the app, reload once so the new screens show straight away
  const had=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(had&&!reloaded&&!dirty.size){reloaded=true;location.reload()}});
  addEventListener("load",()=>navigator.serviceWorker.register("sw.js").then(r=>r.update()).catch(()=>{}));
}
render();
if(CONN)startStore();

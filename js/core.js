// ================= data: setup, players, day sheets, scoring =================
const LIB={jspdf:"https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",auto:"https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"};

const pad2=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
let TODAY=iso(new Date());   // refreshed when the app comes back, so an app left open overnight moves to the new day
const addDays=(s,n)=>{const d=new Date(s+"T00:00");d.setDate(d.getDate()+n);return iso(d)};
const monday=s=>{const d=new Date(s+"T00:00");const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return iso(d)};
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

const DEFAULT_CFG={
  domains:["Daily","Juggling","Flexibility","Core","Crossbar","Foot tennis","Special"],
  nototal:["Juggling"],
  acts:{
    Daily:[{id:"pts",name:"Points",max:null}],
    Juggling:[{id:"leg",name:"Leg",max:null},{id:"thigh",name:"Thigh",max:null},{id:"head",name:"Head",max:null},{id:"free",name:"Free",max:null}],
    Flexibility:[{id:"f1",name:"Standing toe touch",max:10},{id:"f2",name:"Ground touch: finger",max:15},{id:"f3",name:"Ground touch: fist",max:20},{id:"f4",name:"Ground touch: palm",max:30},{id:"f5",name:"Standing head to knee",max:30},{id:"f6",name:"Sitting toe touch",max:15},{id:"f7",name:"Sitting head to knee",max:30},{id:"f8",name:"All-done bonus",max:50}],
    Core:[{id:"c1",name:"Plank (1 min)",max:100},{id:"c2",name:"Leg raise (30 sec)",max:50},{id:"c3",name:"Sit-ups (15×3)",max:50}],
    Crossbar:[{id:"pts",name:"Points",max:null}],
    "Foot tennis":[{id:"pts",name:"Points",max:null}],
    Special:[]
  }
};
let CFG=clone(DEFAULT_CFG);
let PLAYERS=[];          // {id,name,adm,group,gender,dob,active,source,ag}
let DAYS={};             // date -> {date,marks:{domain:{pid:{actId:pts}}},specials:[{id,name,max}]}
let NOTES={};            // pid -> text
let SYNCINFO=null;       // {at,count}
const LOADED={players:false,days:false};
let ver=0;
const bump=()=>{ver++};

// ---------- age group from date of birth (age on 1 Jan this year, in two-year bands) ----------
function ageGroup(dob){
  const y=parseInt(String(dob||"").slice(0,4),10);if(!y)return "No DOB";
  const age=new Date().getFullYear()-y-1;let n=age+1;if(n%2)n++;
  if(n<8)n=8;return n>18?"Senior":"U"+n;
}
const active=()=>PLAYERS.filter(p=>p.active!==false&&!p.hidden).sort((a,b)=>a.name.localeCompare(b.name));
const pById=id=>PLAYERS.find(p=>p.id===id);
const groups=()=>[...new Set(active().map(p=>p.group).filter(Boolean))].sort();
const ageGroups=()=>[...new Set(active().map(p=>p.ag))].sort((a,b)=>(parseInt(a.slice(1))||99)-(parseInt(b.slice(1))||99));

// ---------- day sheets ----------
const dayOf=date=>(DAYS[date]=DAYS[date]||{date,marks:{},specials:[]});
const specials=(date=S.date)=>{const d=dayOf(date);d.specials=d.specials||[];if(!d.specials.length)d.specials.push({id:"s"+uid(),name:"",max:null});return d.specials};
const acts=(dom,date=S.date)=>dom==="Special"?specials(date):(CFG.acts[dom]||[]);
const sumRow=r=>Object.values(r||{}).reduce((a,v)=>a+(+v||0),0);
const counts=d=>!CFG.nototal.includes(d);
const outOf=dom=>acts(dom).reduce((a,x)=>x.max==null||a==null?null:a+x.max,0);
const markedOn=date=>{const m=(DAYS[date]||{}).marks||{};return Object.keys(m).filter(d=>Object.values(m[d]||{}).some(r=>Object.keys(r||{}).length))};
// Mark Points opens on a date showing only what was saved for it: its marked domains, or a clean Daily sheet when nothing is saved yet
function openPoints(date){S.date=date;S.saved=null;const m=markedOn(date);S.doms=m.length?CFG.domains.filter(d=>m.includes(d)):[CFG.domains[0]||"Daily"]}

// ---------- scoring index: player -> domain -> [[date,sum,row]] ----------
let IX={v:-1,by:{}};
function index(){
  if(IX.v===ver)return IX.by;const by={};
  for(const [date,dd] of Object.entries(DAYS))for(const [d,m] of Object.entries(dd.marks||{}))for(const [pid,r] of Object.entries(m||{})){
    if(!r||!Object.keys(r).length)continue;((by[pid]=by[pid]||{})[d]=by[pid][d]||[]).push([date,sumRow(r),r]);}
  IX={v:ver,by};return by;
}
function range(period){
  if(period==="This week")return [monday(TODAY),TODAY];
  if(period==="This month")return [TODAY.slice(0,8)+"01",TODAY];
  if(period==="Last 3 months")return [addDays(TODAY,-91),TODAY];
  return ["0000","9999"];
}
const inR=(date,[a,b])=>date>=a&&date<=b;
const score=(pid,d,rg)=>((index()[pid]||{})[d]||[]).reduce((a,[dt,s])=>inR(dt,rg)?a+s:a,0);
const overall=(pid,rg)=>Object.keys(index()[pid]||{}).filter(counts).reduce((a,d)=>a+score(pid,d,rg),0);
const domScore=(pid,d,rg)=>d==="Overall"?overall(pid,rg):score(pid,d,rg);
function rankList(domain,age,rg){
  const arr=active().filter(p=>age==="All"||p.ag===age).map(p=>({p,s:domScore(p.id,domain,rg)})).sort((a,b)=>b.s-a.s||a.p.name.localeCompare(b.p.name));
  let r=0,prev=null;arr.forEach((x,i)=>{if(x.s!==prev){r=i+1;prev=x.s}x.r=r});return arr;
}
const rankOf=(pid,d,age,rg)=>{const x=rankList(d,age,rg).find(r=>r.p.id===pid);return x?x.r:0};
function weekly(pid,d,n=8){
  const end=monday(TODAY),keys=Array.from({length:n},(_,i)=>addDays(end,-7*(n-1-i)));
  return keys.map(k=>domScore(pid,d,[k,addDays(k,6)]));
}
function jugBest(pid,rg){
  const names={};(CFG.acts.Juggling||[]).forEach(a=>names[a.id]=a.name);const best={};
  ((index()[pid]||{}).Juggling||[]).forEach(([dt,,r])=>{if(!inR(dt,rg))return;Object.entries(r).forEach(([k,v])=>{const n=names[k]||k;best[n]=Math.max(best[n]||0,+v||0)})});
  return (CFG.acts.Juggling||[]).map(a=>[a.name,best[a.name]||0]);
}
const domainsWithData=()=>{const s=new Set(CFG.domains);Object.values(index()).forEach(m=>Object.keys(m).forEach(d=>s.add(d)));return [...s]};

// a day as stored: no blank, unused special rows; no timestamp (for comparing)
function normDay(x){const d=clone(x||{});delete d.updatedAt;d.marks=d.marks||{};d.specials=(d.specials||[]).filter(s=>s.name||Object.values(d.marks.Special||{}).some(r=>r&&r[s.id]!=null));return d}

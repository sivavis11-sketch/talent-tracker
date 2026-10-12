// ---------- realistic domain icons: shaded 3D-style drawings + a real photo of the ball ----------
// Gradients live once in #defs (in the page markup) so every icon can reference them.
const DEFS=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".35" stop-color="#f5c542"/><stop offset=".7" stop-color="#c9891a"/><stop offset="1" stop-color="#8a5a0b"/></linearGradient>
<linearGradient id="gGoldV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6510"/><stop offset=".3" stop-color="#ffe17a"/><stop offset=".55" stop-color="#e8ae2c"/><stop offset="1" stop-color="#8a5a0b"/></linearGradient>
<linearGradient id="gChrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b9c3d3"/><stop offset=".7" stop-color="#7d889a"/><stop offset="1" stop-color="#e6ebf2"/></linearGradient>
<radialGradient id="gFace" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".8" stop-color="#e9eef5"/><stop offset="1" stop-color="#c4ccd8"/></radialGradient>
<linearGradient id="gPost" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#aab4c3"/><stop offset=".4" stop-color="#ffffff"/><stop offset="1" stop-color="#8f99a8"/></linearGradient>
<linearGradient id="gPostH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#d9dfe8"/><stop offset="1" stop-color="#8f99a8"/></linearGradient>
<linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe5ee"/></linearGradient>
<linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b5a"/><stop offset="1" stop-color="#c3261b"/></linearGradient>
<linearGradient id="gYellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset=".55" stop-color="#f2b705"/><stop offset="1" stop-color="#a87400"/></linearGradient>
<linearGradient id="gTape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6bf"/><stop offset="1" stop-color="#f2d24c"/></linearGradient>
<linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fa0ff"/><stop offset="1" stop-color="#1d3fa8"/></linearGradient>
<linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5be35b"/><stop offset="1" stop-color="#1c8f2a"/></linearGradient>
<radialGradient id="gShade" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<pattern id="pNet" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0L3 3M3 0L0 3" stroke="#e8eef8" stroke-width=".45" opacity=".85"/></pattern>
</defs></svg>`;
const BALL_IMG="img/ball.webp";
const ballAt=(x,y,r)=>`<ellipse cx="${x}" cy="${y+r*.95}" rx="${r*.9}" ry="${r*.25}" fill="url(#gShade)"/><image href="${BALL_IMG}" x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}"/>`;
const ICONS={
  Daily:`<ellipse cx="24" cy="44" rx="16" ry="2.5" fill="url(#gShade)"/>
    <rect x="7" y="9" width="34" height="33" rx="5" fill="url(#gPaper)" stroke="#9aa6b8" stroke-width=".6"/>
    <path d="M7 14a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v5H7z" fill="url(#gRed)"/>
    <rect x="14" y="5" width="3.4" height="9" rx="1.7" fill="url(#gChrome)" stroke="#6b7586" stroke-width=".5"/>
    <rect x="30.6" y="5" width="3.4" height="9" rx="1.7" fill="url(#gChrome)" stroke="#6b7586" stroke-width=".5"/>
    <g fill="#c5cdd9">${[0,1,2,3].map(c=>[0,1].map(r=>`<rect x="${11+c*7}" y="${23+r*6}" width="4.5" height="3.6" rx=".8"/>`).join("")).join("")}</g>
    <circle cx="31" cy="33" r="7.4" fill="url(#gGreen)" stroke="#fff" stroke-width="1.4"/>
    <path d="M27.6 33.2l2.4 2.4 4.6-5" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`,
  Juggling:null, // real photo of the ball
  Flexibility:`<ellipse cx="22" cy="44" rx="17" ry="2.5" fill="url(#gShade)"/>
    <path d="M30 31h14v5.5a2 2 0 0 1-2 2H30z" fill="url(#gTape)" stroke="#b08b10" stroke-width=".5"/>
    <g stroke="#3a3000" stroke-width=".7">${[0,1,2,3,4,5].map(i=>`<path d="M${32+i*2} 31v${i%2?2:3.4}"/>`).join("")}</g>
    <rect x="42" y="30" width="3" height="9" rx="1" fill="url(#gChrome)"/>
    <rect x="4" y="12" width="28" height="28" rx="8" fill="url(#gYellow)" stroke="#8a6000" stroke-width=".6"/>
    <rect x="6" y="14" width="24" height="5" rx="2.5" fill="#fff" opacity=".28"/>
    <circle cx="18" cy="26" r="8.5" fill="#26282d"/><circle cx="18" cy="26" r="6.2" fill="url(#gChrome)"/>
    <circle cx="18" cy="26" r="2" fill="#5d6675"/><rect x="26" y="33" width="5" height="4" rx="1.2" fill="#26282d"/>`,
  Core:`<ellipse cx="24" cy="45" rx="15" ry="2.3" fill="url(#gShade)"/>
    <rect x="20.5" y="2.5" width="7" height="4.5" rx="1.4" fill="url(#gChrome)" stroke="#6b7586" stroke-width=".5"/>
    <rect x="22.6" y="6.5" width="2.8" height="4" fill="url(#gPost)"/>
    <path d="M35 9.5l3.4-3.4 2.6 2.6-3.4 3.4z" fill="url(#gChrome)" stroke="#6b7586" stroke-width=".5"/>
    <circle cx="24" cy="27" r="17" fill="url(#gChrome)" stroke="#5b6576" stroke-width=".7"/>
    <circle cx="24" cy="27" r="13.6" fill="url(#gFace)" stroke="#8994a6" stroke-width=".6"/>
    <g stroke="#2a3140" stroke-linecap="round">${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,r1=i%3?11.6:10.4;return `<line x1="${(24+r1*Math.sin(a)).toFixed(2)}" y1="${(27-r1*Math.cos(a)).toFixed(2)}" x2="${(24+12.8*Math.sin(a)).toFixed(2)}" y2="${(27-12.8*Math.cos(a)).toFixed(2)}" stroke-width="${i%3?.7:1.3}"/>`}).join("")}</g>
    <path d="M24 27L24 15.5" stroke="#d6261b" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M24 27L31 31" stroke="#1e2533" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="24" cy="27" r="1.8" fill="#d6261b"/>
    <path d="M13 19a14 14 0 0 1 9-6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`,
  Crossbar:`<ellipse cx="24" cy="44.5" rx="21" ry="2.5" fill="url(#gShade)"/>
    <path d="M7 12h34l-4 9H11z" fill="url(#pNet)" opacity=".9"/>
    <path d="M11 21h26v21H11z" fill="url(#pNet)" opacity=".75"/>
    <path d="M7 12l4 9v21M41 12l-4 9v21M11 21h26" stroke="#c9d2df" stroke-width=".6" fill="none"/>
    <rect x="4.5" y="9.5" width="39" height="4" rx="2" fill="url(#gPostH)" stroke="#7f8a9b" stroke-width=".4"/>
    <rect x="4.5" y="10" width="4" height="34" rx="2" fill="url(#gPost)" stroke="#7f8a9b" stroke-width=".4"/>
    <rect x="39.5" y="10" width="4" height="34" rx="2" fill="url(#gPost)" stroke="#7f8a9b" stroke-width=".4"/>
    <path d="M23 7.5l2 1.5M38.5 4.5l-1.8 1.6M39.5 9.5l-2.2-.2" stroke="#ffd166" stroke-width="1.1" stroke-linecap="round"/>
    <image href="${BALL_IMG}" x="25" y="0" width="12" height="12"/>`,
  "Foot tennis":`<ellipse cx="24" cy="44.5" rx="21" ry="2.5" fill="url(#gShade)"/>
    <rect x="5" y="27" width="38" height="10" fill="url(#pNet)"/>
    <rect x="5" y="25.6" width="38" height="2.6" rx="1.2" fill="url(#gPostH)" stroke="#7f8a9b" stroke-width=".4"/>
    <rect x="3.4" y="24" width="3.2" height="20" rx="1.6" fill="url(#gPost)"/>
    <rect x="41.4" y="24" width="3.2" height="20" rx="1.6" fill="url(#gPost)"/>
    <path d="M10 22c4-12 12-16 20-14" stroke="#fff" stroke-width="1" stroke-dasharray="1.6 2" fill="none" opacity=".75"/>
    <image href="${BALL_IMG}" x="28" y="2" width="15" height="15"/>`,
  Special:`<ellipse cx="24" cy="45" rx="14" ry="2.3" fill="url(#gShade)"/>
    <path d="M12 8H5.5c0 9 4 13.5 9.5 14.5" fill="none" stroke="url(#gGoldV)" stroke-width="3"/>
    <path d="M36 8h6.5c0 9-4 13.5-9.5 14.5" fill="none" stroke="url(#gGoldV)" stroke-width="3"/>
    <path d="M11 5h26v6c0 9-5.6 15.5-13 15.5S11 20 11 11z" fill="url(#gGoldV)" stroke="#7a4d06" stroke-width=".6"/>
    <path d="M15 8v4c0 6 2.6 10.5 6 12" stroke="#fff6cc" stroke-width="1.6" fill="none" opacity=".75" stroke-linecap="round"/>
    <path d="M21.5 26h5v6h-5z" fill="url(#gGoldV)"/>
    <path d="M16 32h16l2 5H14z" fill="url(#gGold)" stroke="#7a4d06" stroke-width=".5"/>
    <rect x="12" y="37" width="24" height="6" rx="1.2" fill="#3a2a1a"/><rect x="16" y="38.6" width="16" height="2.8" rx=".6" fill="url(#gGold)"/>
    <path d="M24 10.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff6cc" opacity=".9"/>`,
  Overall:`<ellipse cx="24" cy="45" rx="12" ry="2.2" fill="url(#gShade)"/>
    <path d="M14 3h8l5 14h-8z" fill="url(#gBlue)"/><path d="M34 3h-8l-5 14h8z" fill="url(#gRed)"/>
    <circle cx="24" cy="30" r="13" fill="url(#gGold)" stroke="#7a4d06" stroke-width=".7"/>
    <circle cx="24" cy="30" r="9.6" fill="none" stroke="#fff3c4" stroke-width="1" opacity=".7"/>
    <path d="M24 23l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" fill="#fff3c4"/>`,
  Generic:`<ellipse cx="24" cy="45" rx="12" ry="2.2" fill="url(#gShade)"/>
    <circle cx="24" cy="25" r="17" fill="url(#gBlue)" stroke="#0d2466" stroke-width=".7"/>
    <circle cx="24" cy="25" r="13" fill="none" stroke="#cfe0ff" stroke-width="1" opacity=".6"/>
    <path d="M24 15l2.9 6 6.6.9-4.8 4.6 1.2 6.5L24 30l-5.9 3 1.2-6.5-4.8-4.6 6.6-.9z" fill="url(#gGold)"/>`
};
const icon=d=>d==="Juggling"?`<img src="${BALL_IMG}" alt="">`:`<svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[d]||ICONS.Generic}</svg>`;

const HOMEI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>';
const BACKI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
const ARR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
const DLI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
const SYNCI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/></svg>';

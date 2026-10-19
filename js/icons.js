// ---------- icons (solid shapes; lime line icons on black cards) ----------
const BALL_IMG="img/ball.webp";
const NAVI={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="currentColor"/></svg>',
  points:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" fill="currentColor"/></svg>',
  setup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 5h-2v4H7v2h4v4h2v-4h4v-2h-4z" fill="currentColor"/></svg>',
  rank:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20v-7h5v7zM9.5 20V7h5v13zM16 20v-9h5v9z" fill="currentColor"/></svg>',
  downloads:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4v9h4l-6 6-6-6h4zM4 19h16v2H4z" fill="currentColor"/></svg>'
};
const BACKI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const REFRESHI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>';
const PLAYI='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l10 7-10 7z" fill="currentColor"/><rect x="17" y="5" width="3" height="14" rx="1" fill="currentColor"/></svg>';
const DLI=c=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4v9h4l-6 6-6-6h4zM4 19h16v2H4z" fill="${c}"/></svg>`;
const SYNCI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/></svg>';
const TROPHYI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8l-1-3H9z"/></svg>';
const GRIDI='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="3.5"/><rect x="4" y="13" width="7" height="7" rx="3.5"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
const USERSI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>';
const CALI='<svg class="cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

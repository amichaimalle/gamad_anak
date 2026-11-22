// איורים דקורטיביים מתוך העיצוב (חנוכייה, סביבון, סופגנייה, נצנוצים)

const STAR = 'M0-7C1-2 2-1 7 0 2 1 1 2 0 7-1 2-2 1-7 0-2-1-1-2 0-7Z';

function Svg({ html, ...props }) {
  return <svg aria-hidden="true" {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Sparkles({ items }) {
  // items: [left%, top px, scale, delay]
  return (
    <div className="bg-deco" aria-hidden="true">
      {items.map(([x, y, s = 1, d = 0], i) => (
        <svg
          key={i}
          width="20"
          height="20"
          viewBox="-10 -10 20 20"
          style={{ position: 'absolute', left: `${x}%`, top: y, transform: `scale(${s})` }}
        >
          <path className="tw" style={{ animationDelay: `${d}s` }} d={STAR} fill="#FFC83D" />
        </svg>
      ))}
    </div>
  );
}

const MENORAH = `<g fill="none" stroke-linecap="round"><g stroke="#0B1440" stroke-width="10"><path d="M16 82 Q16 146 120 146"/><path d="M42 82 Q42 131 120 131"/><path d="M68 82 Q68 115 120 115"/><path d="M94 82 Q94 100 120 100"/><path d="M224 82 Q224 146 120 146"/><path d="M198 82 Q198 131 120 131"/><path d="M172 82 Q172 115 120 115"/><path d="M146 82 Q146 100 120 100"/><path d="M120 58 V152"/></g><g stroke="#FFC83D" stroke-width="4.5"><path d="M16 82 Q16 146 120 146"/><path d="M42 82 Q42 131 120 131"/><path d="M68 82 Q68 115 120 115"/><path d="M94 82 Q94 100 120 100"/><path d="M224 82 Q224 146 120 146"/><path d="M198 82 Q198 131 120 131"/><path d="M172 82 Q172 115 120 115"/><path d="M146 82 Q146 100 120 100"/><path d="M120 58 V152"/></g></g><rect x="86" y="150" width="68" height="14" rx="7" fill="#FFC83D" stroke="#0B1440" stroke-width="3"/><g stroke="#0B1440" stroke-width="2.5"><rect x="10" y="56" width="12" height="28" rx="4" fill="#8EC5FF"/><rect x="36" y="56" width="12" height="28" rx="4" fill="#FFFFFF"/><rect x="62" y="56" width="12" height="28" rx="4" fill="#8EC5FF"/><rect x="88" y="56" width="12" height="28" rx="4" fill="#FFFFFF"/><rect x="114" y="32" width="12" height="28" rx="4" fill="#FFC83D"/><rect x="140" y="56" width="12" height="28" rx="4" fill="#FFFFFF"/><rect x="166" y="56" width="12" height="28" rx="4" fill="#8EC5FF"/><rect x="192" y="56" width="12" height="28" rx="4" fill="#FFFFFF"/><rect x="218" y="56" width="12" height="28" rx="4" fill="#8EC5FF"/></g><g fill="#FFC83D" stroke="#0B1440" stroke-width="2.5" stroke-linejoin="round"><path class="flame" d="M16 30C22 38 24 44 24 47A8 8 0 0 1 8 47C8 44 10 38 16 30Z"/><path class="flame" style="animation-delay:.2s" d="M42 30C48 38 50 44 50 47A8 8 0 0 1 34 47C34 44 36 38 42 30Z"/><path class="flame" style="animation-delay:.5s" d="M68 30C74 38 76 44 76 47A8 8 0 0 1 60 47C60 44 62 38 68 30Z"/><path class="flame" style="animation-delay:.1s" d="M94 30C100 38 102 44 102 47A8 8 0 0 1 86 47C86 44 88 38 94 30Z"/><path class="flame" style="animation-delay:.35s" d="M120 4C127 13 129 19 129 23A9 9 0 0 1 111 23C111 19 113 13 120 4Z"/><path class="flame" style="animation-delay:.6s" d="M146 30C152 38 154 44 154 47A8 8 0 0 1 138 47C138 44 140 38 146 30Z"/><path class="flame" style="animation-delay:.25s" d="M172 30C178 38 180 44 180 47A8 8 0 0 1 164 47C164 44 166 38 172 30Z"/><path class="flame" style="animation-delay:.45s" d="M198 30C204 38 206 44 206 47A8 8 0 0 1 190 47C190 44 192 38 198 30Z"/><path class="flame" style="animation-delay:.15s" d="M224 30C230 38 232 44 232 47A8 8 0 0 1 216 47C216 44 218 38 224 30Z"/></g>`;

const dreidel = (letter, top = '#FFC83D') =>
  `<g class="spin"><rect x="29" y="3" width="12" height="20" rx="5" fill="${top}" stroke="#0B1440" stroke-width="3"/><path d="M8 22 H62 V54 L35 88 L8 54 Z" fill="#8EC5FF"/><path d="M46 22 H62 V54 L35 88 L46 54 Z" fill="#5E9BEA"/><path d="M8 22 H62 V54 L35 88 L8 54 Z" fill="none" stroke="#0B1440" stroke-width="3" stroke-linejoin="round"/>${
    letter
      ? `<text x="27" y="48" text-anchor="middle" font-family="Fredoka, Rubik, sans-serif" font-size="24" font-weight="700" fill="#0B1440">${letter}</text>`
      : ''
  }</g>`;

const DONUT = `<g class="bob"><ellipse cx="48" cy="44" rx="42" ry="22" fill="#F4A65B" stroke="#0B1440" stroke-width="3"/><path d="M10 40 Q12 22 48 20 Q84 22 86 40 Q78 33 68 38 Q58 31 48 37 Q38 31 28 38 Q18 33 10 40Z" fill="#FFFFFF" stroke="#0B1440" stroke-width="3" stroke-linejoin="round"/><ellipse cx="48" cy="24" rx="10" ry="6" fill="#E8445A" stroke="#0B1440" stroke-width="3"/><ellipse cx="45" cy="22" rx="3" ry="1.5" fill="#FFFFFF"/></g>`;

export function Hero() {
  return (
    <div className="hero">
      <Svg html={MENORAH} width="240" height="170" viewBox="0 0 240 170" style={{ position: 'absolute', left: '50%', marginLeft: -120, top: 0 }} />
      <Svg html={dreidel('נ')} width="70" height="92" viewBox="0 0 70 92" style={{ position: 'absolute', left: -4, bottom: 0 }} />
      <Svg html={DONUT} width="96" height="70" viewBox="0 0 96 70" style={{ position: 'absolute', right: -6, bottom: 6 }} />
    </div>
  );
}

export function Dreidel({ letter = 'ג', width = 46, height = 60 }) {
  return <Svg html={dreidel(letter)} width={width} height={height} viewBox="0 0 70 92" />;
}

export function DrawDreidel() {
  const html = `<g class="spin"><rect x="29" y="3" width="12" height="20" rx="5" fill="#FFFFFF" stroke="#0B1440" stroke-width="4"/><path d="M8 22 H62 V54 L35 88 L8 54 Z" fill="#8EC5FF" stroke="#0B1440" stroke-width="4" stroke-linejoin="round"/></g>`;
  return <Svg html={html} width="30" height="40" viewBox="0 0 70 92" />;
}

// אייקונים בקו
const icon = (d, { size = 18, color = 'currentColor', w = 2.2 } = {}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const Icons = {
  exit: () => icon('M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', { color: '#FFFFFF' }),
  enter: () => icon('M19 12H5M11 6l-6 6 6 6', { size: 22, w: 2.6 }),
  alert: () => icon('M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M12 7v6M12 17h.01', { size: 16, color: '#C21F3A', w: 2.6 }),
  check: (color = '#11592F') => icon('M5 12l5 5 9-10', { color, w: 2.8 }),
  gift: () => icon('M3 11h18v10H3zM12 11v10M2 7h20v4H2zM12 7c-2-4-6-4-6-1.5S10 7 12 7zM12 7c2-4 6-4 6-1.5S14 7 12 7z', { size: 24, color: '#1B2A78' }),
  star: () => icon('M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z', { size: 24, color: '#1B2A78' }),
  lock: () => icon('M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3', { size: 16, color: '#4A5280' }),
  plus: () => icon('M12 5v14M5 12h14', { color: '#FFFFFF', w: 2.8 }),
  ban: () => icon('M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M5.6 5.6l12.8 12.8', { size: 22, color: '#C21F3A', w: 2.4 }),
  trash: () => icon('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', { size: 22, color: '#4A5280' }),
  copy: () => icon('M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM5 15V5a1 1 0 0 1 1-1h9', { color: '#FFFFFF' }),
  reset: () => icon('M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.2 2.5M18.5 9A7 7 0 0 0 6.3 6.5', { size: 20, color: '#FFC2CB', w: 2.4 }),
  warn: () => icon('M12 3l10 18H2zM12 10v5M12 18h.01', { size: 30, color: '#C21F3A', w: 2.4 }),
  redraw: () => icon('M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5', { size: 20, color: '#BFE0FF', w: 2.4 }),
  redrawBig: () => icon('M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5', { size: 30, color: '#1B2A78', w: 2.4 }),
  refresh: () => icon('M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', { size: 18, color: '#1B2A78' }),
};

export function DoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B1440" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="#FFFFFF" />
      <path d="M7 12.5l3.5 3.5L17 9" />
    </svg>
  );
}

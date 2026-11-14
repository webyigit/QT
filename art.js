// 말씀 주제별 선화(線畫) 일러스트 — 직접 제작한 SVG. viewBox 0 0 120 120, stroke=currentColor
const rays = (cx, cy, r1, r2, n, a0 = 0, a1 = 360) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = ((a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1))) * Math.PI) / 180;
    s += `M${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}L${(cx + r2 * Math.cos(a)).toFixed(1)} ${(cy + r2 * Math.sin(a)).toFixed(1)}`;
  }
  return `<path d="${s}"/>`;
};
const ground = `<path d="M8 104h104" opacity=".5"/>`;
const leaf = (x, y, r, k = 1.6) => `<path d="M${x} ${y}q${6*k} ${-6*k} ${12*k} 0q${-6*k} ${6*k} ${-12*k} 0z" transform="rotate(${r} ${x} ${y})"/>`;

export const ART = {
  light: `<circle cx="60" cy="56" r="14"/><circle cx="60" cy="56" r="22" opacity=".35"/>${rays(60, 56, 28, 44, 16, 0, 337.5)}`,
  sunrise: `<path d="M30 92a30 30 0 0 1 60 0"/>${rays(60, 92, 38, 52, 9, 180, 360)}<path d="M14 92h92M26 100h68M40 108h40" opacity=".6"/>`,
  rainbow: `<path d="M18 92a42 42 0 0 1 84 0"/><path d="M26 92a34 34 0 0 1 68 0" opacity=".7"/><path d="M34 92a26 26 0 0 1 52 0" opacity=".5"/><path d="M12 96q10-8 20 0q10-8 20 0M70 96q10-8 20 0q10-8 20 0" opacity=".6"/>`,
  path: `<path d="M56 104q-14-22 6-40t2-40" /><path d="M72 104q-6-20 8-38t0-42" opacity=".6"/><circle cx="64" cy="18" r="6"/>${rays(64, 18, 9, 14, 8, 0, 315)}<path d="M20 104q8-14 18-10M100 104q-8-12-16-8" opacity=".5"/>`,
  shield: `<path d="M60 18l34 12v26c0 24-16 40-34 48c-18-8-34-24-34-48V30z"/><path d="M60 30v62M42 54h36" opacity=".8"/><path d="M60 24l28 10v22c0 20-13 34-28 41" opacity=".35"/>`,
  hands: `<g transform="translate(-16 -12) scale(1.25)"><path d="M58 100V62c0-4-6-6-8-2l-8 18M58 70l-4-26c-1-5 6-6 7-1l3 22"/><path d="M62 100V62c0-4 6-6 8-2l8 18M62 70l4-26c1-5-6-6-7-1l-3 22"/><path d="M40 82l10 18M80 82l-10 18" opacity=".7"/>${rays(60, 36, 14, 22, 5, 220, 320)}</g>`,
  olive: `<path d="M22 96q34-14 74-66"/>${leaf(36, 90, -80)}${leaf(40, 88, 10)}${leaf(54, 80, -95)}${leaf(58, 77, 0)}${leaf(70, 66, -110)}${leaf(74, 62, -15)}${leaf(84, 50, -120)}${leaf(88, 44, -30)}${leaf(96, 30, -60)}<ellipse cx="50" cy="94" rx="4" ry="5"/><ellipse cx="68" cy="84" rx="4" ry="5"/>`,
  heart: `<path d="M60 96C34 78 22 64 22 48a18 18 0 0 1 38-6a18 18 0 0 1 38 6c0 16-12 30-38 48z"/><path d="M60 84C42 72 32 62 32 50a10 10 0 0 1 20-4" opacity=".4"/>${rays(60, 60, 44, 50, 7, 200, 340)}`,
  rock: `<path d="M14 100l18-36l14 8l16-34l16 22l10-8l18 48z"/><path d="M46 72l8 28M62 38l4 62M78 60l-4 40" opacity=".4"/><path d="M60 22v-10M55 17h10" opacity=".6"/>`,
  cross: `<path d="M54 16h12v26h22v12H66v50H54V54H32V42h22z"/>${rays(60, 48, 34, 48, 12, 0, 330)}<path d="M24 104h72" opacity=".5"/>`,
  tree: `<path d="M60 104V62M60 78l-14-10M60 70l14-12"/><path d="M60 16c-20 0-34 14-30 30c-10 6-6 24 8 24h44c14 0 18-18 8-24c4-16-10-30-30-30z"/><path d="M28 108q8-6 16 0q8-6 16 0q8-6 16 0q8-6 16 0" opacity=".6"/><circle cx="48" cy="40" r="2.5"/><circle cx="70" cy="34" r="2.5"/><circle cx="74" cy="54" r="2.5"/>`,
  shepherd: `<path d="M38 104V40c0-14 18-14 18 0"/><ellipse cx="74" cy="80" rx="20" ry="13"/><path d="M58 76a6 6 0 0 1 2-10M62 70a6 6 0 0 1 8-6M72 66a6 6 0 0 1 9 0M84 68a6 6 0 0 1 6 8" opacity=".6"/><circle cx="96" cy="74" r="6"/><path d="M66 92v12M82 92v12"/>${ground}`,
  water: `<path d="M60 14q22 30 22 48a22 22 0 0 1-44 0q0-18 22-48z"/><path d="M50 62a10 10 0 0 0 10 10" opacity=".6"/><path d="M14 96q8-6 16 0t16 0t16 0t16 0t16 0t16 0M14 106q8-6 16 0t16 0t16 0t16 0t16 0t16 0" opacity=".6"/>`,
  door: `<path d="M34 104V50a26 26 0 0 1 52 0v54z"/><path d="M42 104V52a18 18 0 0 1 36 0v52" opacity=".5"/><circle cx="72" cy="78" r="2.5"/>${rays(60, 60, 34, 46, 7, 200, 340)}<path d="M20 104h80"/>`,
  anchor: `<circle cx="60" cy="24" r="7"/><path d="M60 31v68M44 44h32"/><path d="M28 74c2 18 16 26 32 26s30-8 32-26"/><path d="M22 80l6-8l8 6M98 80l-6-8l-8 6"/>`,
  seed: `<path d="M60 100V58"/><path d="M60 72c-18 2-26-8-26-22c16 0 26 8 26 22z"/><path d="M60 62c16 0 24-10 24-24c-14 0-24 10-24 24z"/><path d="M20 100q40-10 80 0" /><ellipse cx="60" cy="104" rx="10" ry="3" opacity=".5"/>`,
  wings: `<path d="M60 70C44 50 26 44 10 46c10 6 12 12 14 18c-8 0-12 2-14 6c14 6 30 6 50 0z"/><path d="M60 70c16-20 34-26 50-24c-10 6-12 12-14 18c8 0 12 2 14 6c-14 6-30 6-50 0z"/><path d="M60 60v32M54 92h12" /><path d="M24 54q16 0 30 12M96 54q-16 0-30 12" opacity=".5"/>`,
  mountain: `<path d="M8 100l34-50l14 18l18-38l38 70z"/><path d="M66 44l8 8l6-6M36 60l6 6l4-4" opacity=".6"/>${rays(84, 22, 8, 14, 6, 180, 360)}<circle cx="84" cy="22" r="5"/>`,
  lamp: `<path d="M30 76c0 10 12 14 30 14s30-4 30-14c-8 2-12-2-30-2s-22 4-30 2z"/><path d="M90 76q10-2 12-10"/><path d="M60 90v10M46 104h28"/><path d="M60 72q-8-10 0-24q8 14 0 24z"/>${rays(60, 58, 18, 26, 7, 200, 340)}`,
  bread: `<path d="M22 74c0-16 16-24 38-24s38 8 38 24v6H22z"/><path d="M40 56l6 12M56 52l4 14M72 54l2 12" opacity=".6"/><path d="M18 88h84"/><path d="M60 44V14"/>${leaf(60, 22, -120, 0.9)}${leaf(60, 22, -60, 0.9)}${leaf(60, 32, -125, 0.9)}${leaf(60, 32, -55, 0.9)}`,
  crown: `<path d="M24 84l-6-40l20 18l22-30l22 30l20-18l-6 40z"/><path d="M24 92h72"/><circle cx="60" cy="72" r="5"/><circle cx="40" cy="74" r="3"/><circle cx="80" cy="74" r="3"/>${rays(60, 28, 6, 12, 5, 220, 320)}`,
  lily: `<path d="M60 104V60"/><path d="M60 60c-6-14-4-28 0-36c4 8 6 22 0 36z"/><path d="M60 60c-10-6-22-4-28 4c12 0 20 4 28-4z"/><path d="M60 60c10-6 22-4 28 4c-12 0-20 4-28-4z"/><path d="M60 84q-16-2-22 10M60 80q14-2 20 8" opacity=".6"/>`,
  sea: `<path d="M18 70q14-8 28 0t28 0t28 0"/><path d="M12 82q16-8 32 0t32 0t32 0" opacity=".7"/><path d="M18 94q14-8 28 0t28 0t28 0" opacity=".5"/><path d="M48 62h28l-6 -8H54zM62 54V28l14 22H62" />${rays(92, 28, 6, 11, 6, 0, 300)}`,
  vine: `<path d="M20 30q30 10 40 30t40 26"/>${leaf(34, 34, -60)}${leaf(80, 72, -20)}${leaf(92, 80, 40)}<g opacity=".95"><circle cx="54" cy="70" r="5"/><circle cx="62" cy="70" r="5"/><circle cx="58" cy="78" r="5"/><circle cx="50" cy="78" r="5"/><circle cx="66" cy="78" r="5"/><circle cx="54" cy="86" r="5"/><circle cx="62" cy="86" r="5"/><circle cx="58" cy="94" r="5"/></g><path d="M58 64q0-6 4-8"/>`,
  dove: `<path d="M24 70q20-2 32-14q-4-18 12-24q10-2 14 6l8 2l-8 4q-2 18-18 26q-14 8-40 0z"/><path d="M56 56q-16-24-28-30q4 16 14 26M60 54q4-26 22-36" opacity=".7"/><circle cx="76" cy="38" r="1.5"/><path d="M38 76l-8 10M46 76l-4 12" opacity=".6"/>${rays(60, 60, 44, 52, 9, 200, 340)}`,
};
export const THEMES_KO = { light: '빛', sunrise: '새 아침', rainbow: '언약', path: '길', shield: '방패', hands: '기도', olive: '평강', heart: '사랑', rock: '반석', cross: '십자가', tree: '나무', shepherd: '목자', water: '생수', door: '문', anchor: '소망', seed: '씨앗', wings: '날개', mountain: '산', lamp: '등불', bread: '떡', crown: '왕관', lily: '백합', sea: '바다', vine: '포도나무', dove: '비둘기' };
export function artSvg(key, cls = '') {
  const body = ART[key] || ART.light;
  return `<svg class="${cls}" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

import { VERSES } from './verses.js';
import { ART, ART_STYLE, artSvg } from './art.js';
import { store } from './store.js';
import { createSocial, cleanName, normCode } from './social.js';

/* ───────── 날짜 ───────── */
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const MIN_DATE = '2000-01-01';
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const keyToNum = (k) => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const numToKey = (n) => { const d = new Date(n * DAY); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const parts = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
const BASE = keyToNum('2026-01-01');
const verseFor = (k) => VERSES[(((keyToNum(k) - BASE) % VERSES.length) + VERSES.length) % VERSES.length];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let TODAY = todayKey();
let todayNum = keyToNum(TODAY);
const MIN_NUM = keyToNum(MIN_DATE);
const MAX_AHEAD = 1; // 내일까지 (덮인 카드)

/* ───────── 상태 ───────── */
const $ = (s) => document.querySelector(s);
const ring = $('#ring'), stage = $('#stage');
let pos = 0;           // 오늘 기준 상대 위치(실수). 0=오늘, -1=어제
let anim = null;
let animTarget = null;
let refocus = false; // 진행 중인 애니메이션의 목표
const cards = new Map(); // offset → element
let social = null;

const rmq = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = rmq.matches;
rmq.addEventListener?.('change', (e) => { reduceMotion = e.matches; });
const centerOffset = () => Math.round(pos);
const centerKey = () => numToKey(todayNum + centerOffset());
const isFuture = (k) => keyToNum(k) > todayNum;

/* ───────── 카드 생성 ───────── */
const CORNER = '<svg viewBox="0 0 16 16"><path d="M1 15V6a5 5 0 0 1 5-5h9M5 15V9a4 4 0 0 1 4-4h6"/></svg>';
const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="corner c-${c}" aria-hidden="true">${CORNER}</span>`).join('');
const SEAL = '<span class="read-seal" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 20.5S3.5 15.3 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 6.1-8.5 11.3-8.5 11.3z"/></svg></span>';
const COVER_ART = '<svg viewBox="0 0 120 150" aria-hidden="true"><path d="M20 140V62a40 40 0 0 1 80 0v78z"/><path d="M28 140V64a32 32 0 0 1 64 0v76" opacity=".5"/><path d="M60 40v44M44 58h32"/><path d="M60 100q-10-14 0-28q10 14 0 28z" opacity=".7"/><path d="M8 140h104"/></svg>';

function frontHTML(k) {
  const p = parts(k), v = verseFor(k);
  if (isFuture(k)) {
    return `<div class="cover">${COVER_ART}<p>${p.m}월 ${p.d}일 아침에<br>펼쳐질 말씀이에요</p><small>기다림도 은혜입니다</small></div>`;
  }
  return `${corners}${SEAL}<div class="f-date">${p.m}. ${p.d}. ${WD[p.w]}</div>
    <div class="arch">${artSvg(v.i)}</div>
    <div class="verse"><p class="v-text">${esc(v.t)}</p><div class="v-ref">${esc(v.r)}</div></div>
    <div class="f-foot">말씀 · 묵상</div>`;
}

function fitText(card) {
  const box = card.querySelector('.verse'), t = card.querySelector('.v-text');
  if (!box || !t) return;
  const cw = card.offsetWidth || 260;
  const len = t.textContent.length;
  const MIN = 13; // 본문 최소 글자 크기(px)
  let size = Math.max(MIN, cw * (len < 40 ? 0.075 : len < 70 ? 0.066 : len < 100 ? 0.06 : 0.056));
  const arch = card.querySelector('.arch');
  arch.hidden = false;
  box.classList.remove('scroll');
  t.style.fontSize = size + 'px';
  const over = () => box.scrollHeight > box.clientHeight + 1;
  // 1) 그림을 단계적으로 줄이고 2) 글자를 최소 크기까지 줄이고 3) 그래도 넘치면 카드 안에서 스크롤
  for (const w of ['62%', '52%', '42%', '32%']) { arch.style.width = w; if (!over()) return; }
  let guard = 40;
  while (over() && size > MIN && guard--) { size -= 0.5; t.style.fontSize = size + 'px'; }
  if (over()) { arch.hidden = true; }
  if (over()) box.classList.add('scroll');
}

function makeCard(off) {
  const k = numToKey(todayNum + off);
  const el = $('#tplCard').content.firstElementChild.cloneNode(true);
  el.dataset.key = k;
  el.dataset.off = off;
  const v = verseFor(k);
  el.setAttribute('aria-label', isFuture(k) ? `${parts(k).m}월 ${parts(k).d}일 카드, 아직 덮여 있음` : `${parts(k).m}월 ${parts(k).d}일 말씀, ${v.r}`);
  el.querySelector('.front').innerHTML = frontHTML(k);
  el.classList.toggle('is-read', store.isRead(k));
  ring.appendChild(el);
  syncCardRole(el);
  fitText(el);
  return el;
}

function syncCardRole(el) {
  const front = el.querySelector('.front'), back = el.querySelector('.back');
  const flipped = el.classList.contains('flipped');
  front.inert = flipped; back.inert = !flipped;
  if (flipped) { el.removeAttribute('role'); el.removeAttribute('aria-pressed'); el.tabIndex = -1; }
  else { el.setAttribute('role', 'button'); el.setAttribute('aria-pressed', 'false'); el.tabIndex = el.classList.contains('is-center') ? 0 : -1; }
}

/* ───────── 3D 원형 배치 ───────── */
function layout() {
  const cw = stage.querySelector('.card')?.offsetWidth || 260;
  const R = cw * 1.05;
  const STEP = 40;
  const c = centerOffset();
  // 필요한 카드만 유지 (중앙 ±3)
  for (let o = c - 3; o <= c + 3; o++) {
    if (o < MIN_NUM - todayNum || o > MAX_AHEAD) continue;
    if (!cards.has(o)) cards.set(o, makeCard(o));
  }
  for (const [o, el] of cards) {
    if (o < c - 3 || o > c + 3) { el.remove(); cards.delete(o); continue; }
    const d = o - pos, a = Math.abs(d);
    const ang = d * STEP;
    const lift = d * d * cw * 0.06; // 바깥 카드가 살짝 내려가며 원호를 그림
    el.style.transform = `perspective(${cw * 4}px) translateY(${lift}px) translateZ(${-R}px) rotateY(${ang}deg) translateZ(${R}px) rotateZ(${d * 4}deg)`;
    el.style.opacity = a > 2.2 ? 0 : Math.max(0, 1 - a * 0.32);
    el.style.zIndex = String(100 - Math.round(a * 10));
    el.style.visibility = a > 2.4 ? 'hidden' : 'visible';
    el.style.pointerEvents = a > 1.5 ? 'none' : 'auto';
    const center = a < 0.5;
    if (el.classList.contains('is-center') !== center) {
      el.classList.toggle('is-center', center);
      if (!center && el.classList.contains('flipped')) unflip(el);
    }
    if (!center && el.contains(document.activeElement)) refocus = true; // 포커스를 새 가운데 카드로 넘김
    el.inert = !center;
    syncCardRole(el);
  }
}

function animateTo(target, dur = 520) {
  target = Math.max(MIN_NUM - todayNum, Math.min(MAX_AHEAD, target));
  cancelAnimationFrame(anim);
  animTarget = target;
  const from = pos, t0 = performance.now();
  if (reduceMotion) dur = 1;
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    pos = from + (target - from) * e;
    layout();
    if (t < 1) anim = requestAnimationFrame(step);
    else { pos = target; animTarget = null; layout(); onCenterChange(); }
  };
  anim = requestAnimationFrame(step);
}
const go = (delta) => animateTo((animTarget ?? centerOffset()) + delta);
function goKey(k) {
  const n = keyToNum(k);
  const off = n - todayNum;
  if (Math.abs(off - pos) > 3) { // 먼 날짜는 바로 이동
    cancelAnimationFrame(anim); animTarget = null;
    for (const el of cards.values()) el.remove();
    cards.clear();
    pos = Math.max(MIN_NUM - todayNum, Math.min(MAX_AHEAD, off));
    layout(); onCenterChange();
  } else animateTo(off);
}

/* ───────── 드래그·스와이프 ───────── */
let drag = null;
stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (e.target.closest('.back textarea, .back button, .back input, .back label, .b-friends')) return;
  const wasAnim = animTarget;
  cancelAnimationFrame(anim); animTarget = null;
  drag = { wasAnim, x: e.clientX, y: e.clientY, p: pos, t: performance.now(), moved: false, id: e.pointerId, lastX: e.clientX, lastT: performance.now(), v: 0, target: e.target };
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; try { stage.setPointerCapture(e.pointerId); } catch {} }
  if (!drag.moved) return;
  const cw = stage.querySelector('.card')?.offsetWidth || 260;
  let p = drag.p - dx / (cw * 0.95);
  const lo = MIN_NUM - todayNum, hi = MAX_AHEAD;
  if (p > hi) p = hi + (p - hi) * 0.3; if (p < lo) p = lo + (p - lo) * 0.3; // 끝에서 고무줄 저항
  pos = p;
  const now = performance.now();
  drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
  drag.lastX = e.clientX; drag.lastT = now;
  layout();
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.moved) {
    if (d.wasAnim !== null) { animateTo(d.wasAnim); return; } // 회전 중 탭: 회전을 마저 끝냄
    if (e.type === 'pointercancel') return;
    const card = d.target.closest('.card');
    if (!card) return;
    const off = Number(card.dataset.off);
    if (off === centerOffset()) toggleFlip(card); else animateTo(off);
    return;
  }
  const fling = Math.abs(d.v) > 0.45 ? -Math.sign(d.v) : 0;
  let target = Math.round(pos);
  if (fling && target === Math.round(d.p)) target += fling;
  animateTo(target);
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
$('#prev').onclick = () => go(-1);
$('#next').onclick = () => go(1);
document.addEventListener('keydown', (e) => {
  if (e.target.closest('textarea, input, select, dialog[open]')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  else if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('card')) { e.preventDefault(); toggleFlip(e.target); }
});
// Esc: 뒤집힌 카드를 앞면으로 (입력 중에도)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  const c = document.querySelector('.card.flipped'); if (c) { e.preventDefault(); unflip(c); }
});

/* ───────── 뒤집기 · 묵상 ───────── */
const HINT = '카드를 눌러 뒤집으면 묵상을 적을 수 있어요';
function toggleFlip(card) {
  const k = card.dataset.key;
  if (isFuture(k)) { toast(`${parts(k).m}월 ${parts(k).d}일에 열리는 카드예요`); return; }
  if (card.classList.contains('flipped')) return unflip(card);
  buildBack(card);
  // 뒷면은 화면을 넉넉히 쓰도록 확대
  const r = stage.getBoundingClientRect();
  const grow = Math.max(1, Math.min((r.width - 24) / card.offsetWidth, (r.height - 12) / card.offsetHeight, 1.5));
  card.style.setProperty('--grow', grow.toFixed(3));
  card.classList.add('flipped');
  stage.classList.add('reading');
  syncCardRole(card);
  $('#hint').textContent = '묵상은 자동으로 저장돼요';
  setTimeout(() => card.querySelector('.b-area')?.focus({ preventScroll: true }), reduceMotion ? 0 : 650);
}
function unflip(card) {
  card.classList.remove('flipped');
  stage.classList.remove('reading');
  syncCardRole(card);
  $('#hint').textContent = HINT;
  if (card.classList.contains('is-center')) card.focus({ preventScroll: true });
}

function buildBack(card) {
  const k = card.dataset.key, v = verseFor(k), p = parts(k);
  const back = card.querySelector('.back');
  const id = 'm-' + k;
  back.innerHTML = `${corners}
    <div class="b-head"><h2 class="b-title">나의 묵상</h2><span class="b-ref">${p.m}월 ${p.d}일 · ${esc(v.r)}</span></div>
    <button type="button" class="b-verse" aria-expanded="false" title="말씀 펼치기">${esc(v.t)}</button>
    <label class="sr" for="${id}">${p.m}월 ${p.d}일 묵상 쓰기</label>
    <textarea class="b-area" id="${id}" maxlength="1000" placeholder="이 말씀이 오늘 내게 하시는 말씀은…"></textarea>
    <div class="b-row"><label class="switch"><input type="checkbox" class="b-share"> 친구에게 공개</label><span class="b-saved" aria-live="polite"></span></div>
    <div class="b-friends" tabindex="0" aria-label="함께 묵상한 친구 목록"><h3 class="b-fh">함께 묵상한 친구</h3><div class="fm-list"><p class="fm-empty">불러오는 중…</p></div></div>
    <button class="b-back">앞면 보기</button>`;
  const ta = back.querySelector('textarea'), sw = back.querySelector('.b-share'), saved = back.querySelector('.b-saved');
  ta.value = store.med(k);
  sw.checked = store.medShared(k);
  const save = () => {
    store.setMed(k, ta.value.trim() ? ta.value : '');
    saved.textContent = '저장됨';
    clearTimeout(ta._st); // 카드별 타이머
    ta._st = setTimeout(() => social?.saveMeditation(k, ta.value, sw.checked).catch((e) => toast(e.message)), 1200);
  };
  ta.addEventListener('input', () => { saved.textContent = ''; clearTimeout(ta._t); ta._t = setTimeout(save, 400); });
  ta.addEventListener('blur', save);
  sw.addEventListener('change', () => { store.setMedShared(k, sw.checked); save(); });
  back.querySelector('.b-back').addEventListener('click', () => unflip(card));
  const bv = back.querySelector('.b-verse');
  bv.addEventListener('click', () => { const o = bv.classList.toggle('open'); bv.setAttribute('aria-expanded', String(o)); });
  loadFriendMeds(card);
}
async function loadFriendMeds(card) {
  const k = card.dataset.key, box = card.querySelector('.fm-list');
  if (!social) { box.innerHTML = '<p class="fm-empty">친구 기능을 준비 중이에요.</p>'; return; }
  try {
    const list = await social.friendMeditations(k, !isFuture(k));
    if (card.dataset.key !== k) return;
    box.innerHTML = list.length
      ? list.map((m) => `<div class="fm"><b>${esc(m.name)}</b><p>${esc(m.body)}</p></div>`).join('')
      : '<p class="fm-empty">아직 이 카드에 남긴 친구 묵상이 없어요. 친구 메뉴에서 친구를 맺어보세요.</p>';
  } catch (e) { box.innerHTML = `<p class="fm-empty">${esc(e.message)}</p>`; }
}

/* ───────── 중앙 카드 변화 · 액션바 ───────── */
let pngCache = { k: '', blob: null, p: null };
function prerender(k) {
  if (pngCache.k === k) return pngCache.p;
  pngCache = { k, blob: null, p: renderPNG(k).then((b) => (pngCache.k === k ? (pngCache.blob = b) : b)) };
  return pngCache.p;
}
function onCenterChange() {
  const k = centerKey(), p = parts(k);
  const ae = document.activeElement;
  if (refocus || (ae && ae.classList?.contains('card') && ae.dataset.key !== k)) cards.get(centerOffset())?.focus({ preventScroll: true });
  refocus = false;
  if (!isFuture(k)) setTimeout(() => centerKey() === k && prerender(k), 300);
  const label = k === TODAY ? '오늘' : keyToNum(k) === todayNum - 1 ? '어제' : keyToNum(k) === todayNum + 1 ? '내일' : '';
  $('#dateLine').textContent = `${p.y}년 ${p.m}월 ${p.d}일 ${WD[p.w]}요일${label ? ' · ' + label : ''}`;
  $('#btnToday').hidden = k === TODAY;
  const fut = isFuture(k);
  ['#btnRead', '#btnShare', '#btnSave'].forEach((s) => ($(s).disabled = fut));
  syncRead();
  refreshShareCount();
  try { history.replaceState(null, '', k === TODAY ? location.pathname : `#d=${k}`); } catch {}
}
function syncRead() {
  const k = centerKey(), on = store.isRead(k);
  $('#btnRead').setAttribute('aria-pressed', String(on));
  $('#readCount').textContent = store.readCount();
  $('#readLabel').textContent = on ? `읽음 표시됨, 읽은 카드 ${store.readCount()}장` : `읽음 표시하기, 읽은 카드 ${store.readCount()}장`;
}
async function refreshShareCount() {
  const k = centerKey();
  $('#shareCount').textContent = store.shares(k);
  if (!social) return;
  try { const n = await social.shareCount(k); if (centerKey() === k) $('#shareCount').textContent = n; } catch {}
}
$('#btnRead').onclick = () => {
  const k = centerKey(); if (isFuture(k)) return;
  const on = !store.isRead(k);
  store.setRead(k, on);
  const btn = $('#btnRead'); btn.classList.remove('pop'); void btn.offsetWidth; if (on) btn.classList.add('pop');
  cards.get(centerOffset())?.classList.toggle('is-read', on);
  syncRead();
  toast(on ? `아멘. 읽은 카드 ${store.readCount()}장` : '읽음 표시를 해제했어요');
};

/* ───────── 이미지 저장 · 공유 ───────── */
async function renderPNG(k) {
  const v = verseFor(k), p = parts(k);
  const W = 1080, H = 1800, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  try { await Promise.all([document.fonts.load('400 60px "Gowun Batang"'), document.fonts.load('700 60px "Gowun Batang"')]); } catch {}
  const F = '"Gowun Batang","Nanum Myeongjo",serif';
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#f3e7cc');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const halo = g.createRadialGradient(W / 2, 520, 10, W / 2, 520, 700); halo.addColorStop(0, 'rgba(255,232,170,.55)'); halo.addColorStop(1, 'rgba(255,232,170,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#9a7536'; g.lineWidth = 5; rr(g, 30, 30, W - 60, H - 60, 40); g.stroke();
  g.globalAlpha = .55; g.lineWidth = 2.5; rr(g, 52, 52, W - 104, H - 104, 28); g.stroke(); g.globalAlpha = 1;
  g.fillStyle = '#9a7536'; g.textAlign = 'center'; g.font = `400 40px ${F}`;
  g.fillText(`${p.y}. ${p.m}. ${p.d}. ${WD[p.w]}`.split('').join(String.fromCharCode(8202)), W / 2, 150);
  // 아치 창 + 일러스트
  const aw = 560, ah = 620, ax = (W - aw) / 2, ay = 200;
  g.beginPath(); g.moveTo(ax, ay + ah); g.lineTo(ax, ay + aw / 2); g.arc(W / 2, ay + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, ay + ah); g.closePath();
  g.fillStyle = 'rgba(255,240,205,.8)'; g.fill(); g.lineWidth = 3; g.stroke();
  const line = ART_STYLE === 'line';
  const svg = line ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480" fill="none" stroke="#9a7536" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ART[v.i] || ART.light}</svg>`
    : artSvg(v.i, '', ART_STYLE, `width="${aw}" height="${ah}"`);
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  try {
    await img.decode();
    if (line) g.drawImage(img, (W - 480) / 2, ay + 90, 480, 480);
    else { g.save(); g.beginPath(); g.moveTo(ax, ay + ah); g.lineTo(ax, ay + aw / 2); g.arc(W / 2, ay + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, ay + ah); g.closePath(); g.clip(); g.drawImage(img, ax, ay, aw, ah); g.restore(); g.stroke(); }
  } catch {}
  // 본문
  g.fillStyle = '#2e2820';
  let size = v.t.length < 50 ? 60 : v.t.length < 90 ? 52 : 46;
  let lines;
  for (;;) { g.font = `400 ${size}px ${F}`; lines = wrap(g, v.t, W - 240); if (lines.length * size * 1.6 < 640 || size < 34) break; size -= 2; }
  const lh = size * 1.6, top = 900 + (640 - lines.length * lh) / 2 + size;
  lines.forEach((ln, i) => g.fillText(ln, W / 2, top + i * lh));
  g.fillStyle = '#9a7536'; g.font = `700 42px ${F}`; g.fillText(v.r, W / 2, 1610);
  g.fillStyle = '#6b5d47'; g.font = `400 30px ${F}`; g.fillText('하루하루 말씀카드 · 개역한글', W / 2, 1700);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, text, max) {
  const words = text.split(' '), out = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
    while (g.measureText(line).width > max) { let i = line.length; while (i > 1 && g.measureText(line.slice(0, i)).width > max) i--; out.push(line.slice(0, i)); line = line.slice(i); }
  }
  if (line) out.push(line);
  return out;
}
const fileName = (k) => `wordcard_${k.replace(/-/g, '')}.png`;

$('#btnSave').onclick = async () => {
  const k = centerKey(); if (isFuture(k)) return;
  const blob = pngCache.k === k && pngCache.blob ? pngCache.blob : await prerender(k);
  if (!blob) return toast('이미지를 만들지 못했어요');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const file = new File([blob], fileName(k), { type: 'image/png' });
  if (ios && navigator.canShare?.({ files: [file] })) {
    toast('공유 창에서 "이미지 저장"을 누르면 사진에 저장돼요');
    try { await navigator.share({ files: [file] }); } catch {}
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName(k); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('카드 이미지를 저장했어요');
};
$('#btnShare').onclick = async () => {
  const k = centerKey(); if (isFuture(k)) return;
  const v = verseFor(k);
  const link = `${location.origin}${location.pathname}#d=${k}`;
  const text = `“${v.t}” (${v.r}, 개역한글)`;
  let shared = false;
  const blob = pngCache.k === k ? pngCache.blob : null; // 미리 만든 이미지(사용자 동작 권한이 끊기지 않도록 기다리지 않음)
  const file = blob && new File([blob], fileName(k), { type: 'image/png' });
  const tries = [];
  if (file && navigator.canShare?.({ files: [file] })) tries.push(() => navigator.share({ files: [file], title: '하루하루 말씀카드', text: `${text}\n${link}` }));
  if (navigator.share) tries.push(() => navigator.share({ title: '하루하루 말씀카드', text, url: link }));
  tries.push(async () => { await navigator.clipboard.writeText(`${text}\n${link}`); toast('말씀과 링크를 복사했어요'); });
  let lastErr = null;
  for (const t of tries) {
    try { await t(); shared = true; break; }
    catch (e) { lastErr = e; if (e?.name === 'AbortError') break; }
  }
  if (!shared && lastErr?.name !== 'AbortError') toast('공유하지 못했어요. 브라우저 권한을 확인해 주세요.');
  if (!shared) return;
  try { const n = social ? await social.recordShare(k) : store.addShare(k); $('#shareCount').textContent = n; }
  catch (e) { $('#shareCount').textContent = store.shares(k); }
};
$('#btnToday').onclick = () => goKey(TODAY);

/* ───────── 날짜 검색(달력) ───────── */
const dlgCal = $('#dlgCal');
let calSel = TODAY;
function fillSelect(sel, from, to, val, suffix) { sel.innerHTML = ''; for (let i = from; i <= to; i++) sel.add(new Option(i + suffix, i, false, i === val)); }
function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function syncCalSelects() {
  const t = parts(numToKey(todayNum + MAX_AHEAD)), s = parts(calSel); // 고를 수 있는 마지막 날 = 내일
  fillSelect($('#calYear'), 2000, t.y, s.y, '년');
  fillSelect($('#calMonth'), 1, s.y === t.y ? t.m : 12, s.m, '월');
  const maxD = s.y === t.y && s.m === t.m ? t.d : daysIn(s.y, s.m);
  fillSelect($('#calDay'), 1, maxD, s.d, '일');
  renderGrid();
  $('#calLabel').textContent = `${s.y}년 ${s.m}월`;
}
function clampKey(y, m, d) { d = Math.min(d, daysIn(y, m)); let k = `${y}-${pad(m)}-${pad(d)}`; if (keyToNum(k) > todayNum + MAX_AHEAD) k = numToKey(todayNum + MAX_AHEAD); return k; }
function renderGrid() {
  const s = parts(calSel), grid = $('#calGrid');
  const first = new Date(Date.UTC(s.y, s.m - 1, 1)).getUTCDay(), n = daysIn(s.y, s.m);
  let h = WD.map((w) => `<div class="wd" aria-hidden="true">${w}</div>`).join('');
  for (let i = 0; i < first; i++) h += '<div></div>';
  for (let d = 1; d <= n; d++) {
    const k = `${s.y}-${pad(s.m)}-${pad(d)}`, num = keyToNum(k);
    const cls = ['day', k === TODAY && 'today', k === calSel && 'sel', store.isRead(k) && 'read', store.med(k) && 'med', num > todayNum && 'future'].filter(Boolean).join(' ');
    const dis = num > todayNum + MAX_AHEAD ? 'disabled' : '';
    h += `<button type="button" class="${cls}" data-k="${k}" ${dis} aria-label="${s.m}월 ${d}일 ${WD[(first + d - 1) % 7]}요일${store.isRead(k) ? ', 읽음' : ''}${store.med(k) ? ', 묵상 있음' : ''}">${d}</button>`;
  }
  grid.innerHTML = h;
}
$('#calGrid').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (!b) return; dlgCal.close(); goKey(b.dataset.k); });
['#calYear', '#calMonth', '#calDay'].forEach((s) => $(s).addEventListener('change', () => { calSel = clampKey(+$('#calYear').value, +$('#calMonth').value, +$('#calDay').value); syncCalSelects(); }));
function shiftMonth(d) {
  const s = parts(calSel); let y = s.y, m = s.m + d;
  if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
  if (y < 2000) return;
  const t = parts(numToKey(todayNum + MAX_AHEAD)); if (y > t.y || (y === t.y && m > t.m)) return;
  calSel = clampKey(y, m, s.d); syncCalSelects();
}
$('#calPrev').onclick = () => shiftMonth(-1);
$('#calNext').onclick = () => shiftMonth(1);
$('#calGo').onclick = () => { dlgCal.close(); goKey(calSel); };
$('#btnCal').onclick = () => { calSel = centerKey(); syncCalSelects(); dlgCal.showModal(); };

/* ───────── 친구 ───────── */
const dlgFr = $('#dlgFriends');
async function renderFriends() {
  if (!social) return;
  $('#modeBadge').textContent = social.note;
  try {
    const me = await social.me();
    $('#myName').value = me.name; $('#myCode').textContent = me.code;
    const { friends, requests } = await social.lists();
    $('#reqDot').hidden = !requests.length;
    $('#reqList').innerHTML = requests.length ? requests.map((r) => `<li><span>${esc(r.name)}</span><span class="btns"><button class="pill" data-acc="${esc(r.id)}">수락</button><button class="pill ghost" data-del="${esc(r.id)}">거절</button></span></li>`).join('') : '<li class="empty">받은 요청이 없어요</li>';
    $('#friendList').innerHTML = friends.length ? friends.map((f) => `<li><span>${esc(f.name)}${f.status === 'pending' ? ' <small>(수락 대기)</small>' : ''}</span><button class="pill ghost" data-del="${esc(f.id)}" aria-label="${esc(f.name)} 친구 끊기">끊기</button></li>`).join('') : '<li class="empty">아직 친구가 없어요. 내 코드를 알려주세요.</li>';
  } catch (e) { toast(e.message); }
}
$('#btnFriends').onclick = () => { renderFriends(); dlgFr.showModal(); };
dlgFr.addEventListener('click', async (e) => {
  const acc = e.target.closest('[data-acc]'), del = e.target.closest('[data-del]');
  try {
    if (acc) { await social.accept(acc.dataset.acc); toast('친구가 되었어요'); renderFriends(); }
    if (del) { await social.remove(del.dataset.del); renderFriends(); }
  } catch (err) { toast(err.message); }
});
$('#myName').addEventListener('change', async (e) => { const n = cleanName(e.target.value); if (!n) { social.me().then((m) => (e.target.value = m.name)); return; } try { await social.setName(n); toast('이름을 바꿨어요'); } catch (err) { toast(err.message); } });
$('#friendCode').addEventListener('input', (e) => { e.target.value = normCode(e.target.value); });
$('#addFriend').onclick = async () => {
  try { const msg = await social.addFriend($('#friendCode').value); $('#friendCode').value = ''; toast(msg); renderFriends(); }
  catch (e) { toast(e.message); }
};
$('#copyCode').onclick = async () => { try { await navigator.clipboard.writeText($('#myCode').textContent); toast('친구 코드를 복사했어요'); } catch { toast('복사하지 못했어요'); } };

/* ───────── 정보 · 테마 · 공통 ───────── */
$('#btnInfo').onclick = () => $('#dlgInfo').showModal();
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
$('#wipe').onclick = async () => {
  const live = social?.mode === 'live';
  if (!confirm(live ? '이 기기의 기록과 서버에 올린 묵상·친구 관계·계정을 모두 지울까요? 되돌릴 수 없어요.' : '이 기기에 저장된 읽음 표시와 묵상을 모두 지울까요? 되돌릴 수 없어요.')) return;
  try { await social?.deleteAll(); } catch (e) { toast('서버 기록을 지우지 못했어요. 잠시 후 다시 시도해 주세요.'); return; }
  store.wipe(); location.reload();
};

function effectiveDark() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = effectiveDark();
  $('#btnTheme').setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0f1222' : '#f5eedf'));
}
$('#btnTheme').onclick = () => { const t = effectiveDark() ? 'light' : 'dark'; store.set('theme', t); applyTheme(t); };
applyTheme(store.get('theme'));

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* 빛 입자 */
(function motes() {
  const cv = $('#motes'), g = cv.getContext('2d');
  let W, H, ps = [];
  const resize = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; ps = Array.from({ length: 34 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.6 + .4) * d, s: Math.random() * .25 + .05, a: Math.random() * Math.PI * 2 })); };
  resize(); addEventListener('resize', resize);
  const col = () => getComputedStyle(document.documentElement).getPropertyValue('--mote').trim() || '255,226,160';
  let c = col(); new MutationObserver(() => (c = col())).observe(document.documentElement, { attributes: true });
  const draw = () => {
    g.clearRect(0, 0, W, H);
    for (const p of ps) {
      if (!reduceMotion) { p.y -= p.s; p.a += .01; p.x += Math.sin(p.a) * .2; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; } }
      g.beginPath(); g.fillStyle = `rgba(${c},${.25 + .35 * Math.abs(Math.sin(p.a))})`; g.arc(p.x, p.y, p.r, 0, 7); g.fill();
    }
    if (!reduceMotion && !document.hidden) requestAnimationFrame(draw);
  };
  draw();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduceMotion) requestAnimationFrame(draw); });
})();

/* 날짜가 바뀌면(자정 이후 앱 복귀) 오늘 기준 갱신 */
function checkDay() {
  if (todayKey() !== TODAY) { const keep = centerKey(); TODAY = todayKey(); todayNum = keyToNum(TODAY); for (const el of cards.values()) el.remove(); cards.clear(); pos = 0; layout(); goKey(keep === numToKey(todayNum - 1) ? TODAY : keep); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { store.flush(); return; } checkDay(); });
setInterval(checkDay, 60000);
const validKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && numToKey(keyToNum(k)) === k && keyToNum(k) >= MIN_NUM && keyToNum(k) <= todayNum + MAX_AHEAD;
addEventListener('hashchange', () => { const h = /^#d=(.+)$/.exec(location.hash); if (h && validKey(h[1]) && h[1] !== centerKey()) goKey(h[1]); });
addEventListener('resize', () => { for (const el of cards.values()) fitText(el); layout(); });

/* ───────── 시작 ───────── */
const m = /^#d=(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
if (m && validKey(m[1])) pos = keyToNum(m[1]) - todayNum;
layout();
onCenterChange();
createSocial().then((s) => { social = s; refreshShareCount(); s.lists().then((l) => ($('#reqDot').hidden = !l.requests.length)).catch(() => {}); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

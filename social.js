// 친구·묵상 공유·공유 수 집계. 설정이 있으면 Supabase(무료 플랜), 없으면 체험 모드(가상 데이터).
import { CONFIG } from './config.js';
import { store } from './store.js';

const CODE_RE = /^[A-Z2-9]{6}$/;
export const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);

/* ───────── 체험 모드 ───────── */
const DEMO_NOTE = '체험 모드예요. 아래 친구와 묵상은 화면 확인용 가상 데이터이며 이 기기에만 저장됩니다.';
const MOCK_FRIENDS = [
  { id: 'demo-1', name: '은혜' },
  { id: 'demo-2', name: '소망' },
  { id: 'demo-3', name: '요셉' },
];
const MOCK_LINES = [
  '오늘 이 말씀 앞에서 조급했던 마음을 내려놓습니다.',
  '출근길에 한 번 더 읽었어요. 하루 종일 붙들고 싶은 구절.',
  '내 힘이 아니라 주님의 은혜로 걷는 하루가 되기를.',
  '가족을 위해 이 말씀으로 기도했습니다.',
  '감사할 것을 세 가지 적어보았어요. 작은 것부터 감사.',
  '읽을수록 위로가 됩니다. 함께 기도해요!',
];
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function demoState() {
  let st = store.get('demo');
  if (!st) {
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
    st = { name: '나', code, friends: MOCK_FRIENDS.map((f) => ({ ...f, status: 'accepted' })), requests: [{ id: 'demo-4', name: '다윗', status: 'incoming' }] };
    store.set('demo', st);
  }
  return st;
}

function demoApi() {
  const save = (st) => store.set('demo', st);
  return {
    mode: 'demo', note: DEMO_NOTE,
    async me() { const s = demoState(); return { name: s.name, code: s.code }; },
    async setName(n) { const s = demoState(); s.name = cleanName(n) || '나'; save(s); },
    async addFriend(code) {
      code = normCode(code); const s = demoState();
      if (!CODE_RE.test(code)) throw new Error('코드는 영문·숫자 6자리예요.');
      if (code === s.code) throw new Error('내 코드는 추가할 수 없어요.');
      const id = 'demo-' + code;
      if (s.friends.some((f) => f.id === id)) throw new Error('이미 친구예요.');
      s.friends.push({ id, name: '친구 ' + code.slice(0, 2), status: 'pending' }); save(s);
      return '요청을 보냈어요. (체험 모드: 실제 전송 없음)';
    },
    async lists() { const s = demoState(); return { friends: s.friends, requests: s.requests }; },
    async accept(id) { const s = demoState(); const r = s.requests.find((x) => x.id === id); if (r) { s.requests = s.requests.filter((x) => x !== r); s.friends.push({ ...r, status: 'accepted' }); save(s); } },
    async remove(id) { const s = demoState(); s.friends = s.friends.filter((f) => f.id !== id); s.requests = s.requests.filter((f) => f.id !== id); save(s); },
    async saveMeditation() { /* 체험 모드: 이 기기에만 저장(store) */ },
    async friendMeditations(date, isPastOrToday) {
      if (!isPastOrToday) return [];
      const s = demoState();
      return s.friends.filter((f) => f.status === 'accepted').map((f) => {
        const h = hash(f.id + date);
        return h % 3 === 0 ? null : { name: f.name, body: MOCK_LINES[h % MOCK_LINES.length] };
      }).filter(Boolean);
    },
    async deleteAll() { ok(await sb.rpc('delete_my_account')); await sb.auth.signOut(); },
    async deleteAll() {},
    async recordShare(date) { return store.addShare(date); },
    async shareCount(date) { return store.shares(date); },
  };
}

/* ───────── Supabase 모드 ───────── */
async function liveApi() {
  const { createClient } = await import('./vendor/supabase-js-2.45.4.min.js');
  const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'wordcard-auth' } }); // 같은 도메인의 다른 앱과 로그인 분리
  let { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const r = await sb.auth.signInAnonymously(); // 이메일·실명 없이 익명 계정
    if (r.error) throw r.error;
    session = r.data.session;
  }
  const uid = session.user.id;
  const ok = (r) => { if (r.error) throw new Error(friendly(r.error.message)); return r.data; };
  const friendly = (m) => ({
    not_found: '그 코드의 친구를 찾지 못했어요.', self: '내 코드는 추가할 수 없어요.',
    exists: '이미 친구이거나 요청 중이에요.', bad_code: '코드는 영문·숫자 6자리예요.',
    too_many: '시도 횟수가 많아요. 내일 다시 해 주세요.', bad_date: '이 날짜에는 저장할 수 없어요.',
  }[(m || '').trim()] || '잠시 후 다시 시도해 주세요.');
  let meCache = null;
  return {
    mode: 'live', note: '친구 기능이 켜져 있어요. 닉네임과 "친구 공개"로 고른 묵상만 서버에 저장되고, 수락한 친구에게만 보여요. 이 기기의 앱 데이터를 지우면 계정이 사라지니 유의하세요.',
    async me() {
      if (meCache) return meCache;
      const p = ok(await sb.rpc('ensure_profile'));
      meCache = { name: p[0].nickname, code: p[0].friend_code };
      return meCache;
    },
    async setName(n) { const name = cleanName(n); if (!name) return; ok(await sb.from('profiles').update({ nickname: name }).eq('id', uid)); if (meCache) meCache.name = name; },
    async addFriend(code) {
      code = normCode(code); if (!CODE_RE.test(code)) throw new Error('코드는 영문·숫자 6자리예요.');
      const st = ok(await sb.rpc('request_friend', { p_code: code }));
      if (st === 'not_found' || st === 'self' || st === 'exists') throw new Error(friendly(st));
      return st === 'accepted' ? '친구가 되었어요!' : '요청을 보냈어요. 상대가 수락하면 친구가 돼요.';
    },
    async lists() {
      const rows = ok(await sb.rpc('my_friends'));
      return {
        friends: rows.filter((r) => r.status === 'accepted' || r.direction === 'outgoing').map((r) => ({ id: r.friend_id, name: r.nickname, status: r.status })),
        requests: rows.filter((r) => r.status === 'pending' && r.direction === 'incoming').map((r) => ({ id: r.friend_id, name: r.nickname, status: 'incoming' })),
      };
    },
    async accept(id) { ok(await sb.rpc('accept_friend', { p_other: id })); },
    async remove(id) { ok(await sb.rpc('remove_friend', { p_other: id })); },
    async saveMeditation(date, body, shared) {
      body = String(body || '').slice(0, 1000);
      if (shared && body.trim()) ok(await sb.from('meditations').upsert({ user_id: uid, card_date: date, body, updated_at: new Date().toISOString() }));
      else ok(await sb.from('meditations').delete().eq('user_id', uid).eq('card_date', date)); // 비공개·빈 묵상은 서버에서 지움
    },
    async friendMeditations(date) { return ok(await sb.rpc('friend_meditations', { p_date: date })).map((r) => ({ name: r.nickname, body: r.body })); },
    async deleteAll() { ok(await sb.rpc('delete_my_account')); await sb.auth.signOut(); },
    async recordShare(date) { store.addShare(date); return ok(await sb.rpc('record_share', { p_date: date })); },
    async shareCount(date) { return ok(await sb.rpc('share_count', { p_date: date })); },
  };
}

export async function createSocial() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CONFIG.supabaseUrl)) {
    try { return await liveApi(); } catch (e) { console.warn('친구 서버 연결 실패, 체험 모드로 전환', e); const d = demoApi(); d.note = '친구 서버에 연결하지 못해 체험 모드로 보여드려요. ' + DEMO_NOTE; return d; }
  }
  return demoApi();
}

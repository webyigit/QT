// 이 기기(localStorage)에 저장하는 데이터. 저장소 접근이 막혀도 앱은 메모리로 동작한다.
const KEY = 'wordcard:v1';
const fresh = () => ({ read: {}, med: {}, medShared: {}, shares: {}, theme: '', demo: null });
let data = fresh();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = Object.assign(fresh(), JSON.parse(raw));
} catch { data = fresh(); }
let t;
function persist() {
  clearTimeout(t);
  t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }, 150);
}
export const store = {
  get: (k) => data[k],
  set(k, v) { data[k] = v; persist(); },
  isRead: (d) => !!data.read[d],
  setRead(d, on) { if (on) data.read[d] = 1; else delete data.read[d]; persist(); },
  readCount: () => Object.keys(data.read).length,
  med: (d) => data.med[d] || '',
  setMed(d, txt) { if (txt) data.med[d] = txt; else delete data.med[d]; persist(); },
  medShared: (d) => data.medShared[d] === true, // 기본: 비공개(직접 켜야 친구에게 공개)
  setMedShared(d, on) { data.medShared[d] = !!on; persist(); },
  shares: (d) => data.shares[d] || 0,
  addShare(d) { data.shares[d] = (data.shares[d] || 0) + 1; persist(); return data.shares[d]; },
  wipe() { clearTimeout(t); data = fresh(); try { localStorage.removeItem(KEY); } catch {} },
  flush() { clearTimeout(t); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
};

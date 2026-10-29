// 서귀포시 직영관광지: 위치·소개 + 관람객수 자료(공공데이터) 읽기. 지도(map3d.js)와 "추천 관광지" 구역이 같이 써요.
// 위치는 대략적인 값이에요. 공공데이터에는 좌표가 없어서 이름에 key 가 들어 있으면 이 표의 위치를 써요.
export const TOUR_SITES = [
  { key: '천지연', name: '천지연폭포', emoji: '💧', lon: 126.5543, lat: 33.2468, desc: '서귀포 시내 가까이에서 시원하게 떨어지는 폭포예요.' },
  { key: '정방', name: '정방폭포', emoji: '🌊', lon: 126.5726, lat: 33.2447, desc: '바다로 곧장 쏟아지는 모습으로 알려진 폭포예요.' },
  { key: '서복', name: '서복전시관', emoji: '🏛️', lon: 126.5705, lat: 33.2455, desc: '진시황의 사신 서복의 이야기를 소개하는 전시관이에요.' },
  { key: '이중섭', name: '이중섭미술관', emoji: '🎨', lon: 126.5614, lat: 33.2475, desc: '화가 이중섭이 서귀포에서 지낸 인연을 담은 미술관이에요.' },
  { key: '기당', name: '기당미술관', emoji: '🖼️', lon: 126.56, lat: 33.265, desc: '서귀포에서 만나는 미술관이에요.' },
  { key: '감귤박물관', name: '감귤박물관', emoji: '🍊', lon: 126.6, lat: 33.285, desc: '감귤의 역사와 문화를 소개하는 박물관이에요.' },
  { key: '쇠소깍', name: '쇠소깍', emoji: '🛶', lon: 126.6226, lat: 33.2527, desc: '효돈천이 바다와 만나는 맑고 깊은 하구예요.' },
  { key: '외돌개', name: '외돌개', emoji: '🪨', lon: 126.5459, lat: 33.2388, desc: '바다 한가운데 홀로 솟은 바위로 유명해요.' },
  { key: '소정방', name: '소정방폭포', emoji: '💦', lon: 126.5693, lat: 33.2437, desc: '해안 절벽에서 바다로 떨어지는 작은 폭포예요.' }
];
export const fmtNum = n => Math.round(n).toLocaleString('ko-KR');

// 관람객 자료 → Map(관광지명 → { 연도: 합계 }). 세로형(연도 열)과 가로형(2023년 같은 열 이름) 둘 다 읽어요.
export function parseVisitors(rows) {
  const out = new Map(), add = (name, year, n) => { if (!name || !year || !(n >= 0)) return; const m = out.get(name) || {}; m[year] = (m[year] || 0) + n; out.set(name, m); };
  const num = v => parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  for (const row of rows) {
    const keys = Object.keys(row);
    const kName = keys.find(k => /관광지|시설|명칭|장소|^명$|명$/.test(k) && !/연도|월/.test(k));
    const name = kName && String(row[kName]).trim(); if (!name) continue;
    const wide = keys.filter(k => /^(19|20)\d{2}\s*년?$/.test(k.trim()));
    if (wide.length) { wide.forEach(k => add(name, k.trim().slice(0, 4), num(row[k]))); continue; }
    const kYear = keys.find(k => /연도|년도|^year$|^년$/i.test(k)), kCnt = keys.find(k => /관람객|입장객|방문객|인원|관람/.test(k) && k !== kName);
    if (!kYear || !kCnt) continue;
    const y = String(row[kYear]).match(/(19|20)\d{2}/); if (y) add(name, y[0], num(row[kCnt]));
  }
  return out;
}

// 서버(/api/seogwipo-tour)에서 한 번만 불러와 같이 써요. 실패하면 null.
let pending = null;
export function loadTourStats() {
  if (!pending) pending = (async () => {
    try {
      const r = await fetch('/api/seogwipo-tour?perPage=1000'); if (!r.ok) return null;
      const rows = (await r.json()).data || []; if (!rows.length) return null;
      const stats = parseVisitors(rows), items = [], missing = [];
      stats.forEach((years, name) => {
        const site = TOUR_SITES.find(s => name.includes(s.key)), ys = Object.keys(years).sort();
        if (site) items.push({ name, site, years, ys, last: ys[ys.length - 1] }); else missing.push(name);
      });
      return { items, missing, total: rows.length, parsed: stats.size };
    } catch { return null; }
  })();
  return pending;
}

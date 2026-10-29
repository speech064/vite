// 제주 3D 지도 (three.js). 실제 고도 자료가 아니라, 한라산·오름·해안선을 모양만 닮게 만든 입체 지도예요.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- 지도 좌표 (1 단위 = 약 1km) ----
const LON0 = 126.56, LAT0 = 33.38, KM_LON = 93, KM_LAT = 111, EXAG = 4, TILT = 0.105;
const toXN = (lon, lat) => [(lon - LON0) * KM_LON, (lat - LAT0) * KM_LAT];   // [동쪽 km, 북쪽 km]

export const CATS = {
  mt:      { label: '산·오름',       emoji: '⛰️', color: '#6b8f3a' },
  coast:   { label: '해안',          emoji: '🏖️', color: '#0e7c86' },
  wind:    { label: '풍력·등대',     emoji: '🌬️', color: '#5b7fb5' },
  port:    { label: '항·포구',       emoji: '⚓', color: '#3d5a80' },
  culture: { label: '돌하르방·문화', emoji: '🗿', color: '#7b7b80' },
  orchard: { label: '감귤',          emoji: '🍊', color: '#f08a00' }
};
// 위치는 대략적인 값이에요.
export const LANDMARKS = [
  { id: 'hallasan', name: '한라산', cat: 'mt', lon: 126.533, lat: 33.362, desc: '해발 1,947m, 대한민국에서 가장 높은 산이에요. 꼭대기에는 화구호 백록담이 있어요.' },
  { id: 'seongsan', name: '성산일출봉', cat: 'mt', lon: 126.942, lat: 33.459, desc: '바다에서 솟아오른 분화구 언덕으로, 일출 명소이자 유네스코 세계유산이에요.' },
  { id: 'yongnuni', name: '용눈이오름', cat: 'mt', lon: 126.83, lat: 33.447, desc: '부드러운 능선이 용의 눈 같다고 해서 붙은 이름이에요. 동쪽 오름 군락의 대표 주자예요.' },
  { id: 'saebyeol', name: '새별오름', cat: 'mt', lon: 126.358, lat: 33.364, desc: '서쪽 들판의 오름으로, 해마다 들불축제가 열려요.' },
  { id: 'sanbang', name: '산방산', cat: 'mt', lon: 126.314, lat: 33.239, desc: '종 모양으로 솟은 용암 돔이에요. 남서쪽 해안에서 눈에 띄는 랜드마크예요.' },
  { id: 'hyeopjae', name: '협재해변', cat: 'coast', lon: 126.239, lat: 33.394, desc: '에메랄드빛 얕은 바다와 하얀 모래, 멀리 비양도가 보이는 해변이에요.' },
  { id: 'hamdeok', name: '함덕해변', cat: 'coast', lon: 126.669, lat: 33.543, desc: '북동쪽 해안의 잔잔한 해변으로, 물빛이 맑기로 유명해요.' },
  { id: 'jungmun', name: '중문·색달해변', cat: 'coast', lon: 126.409, lat: 33.245, desc: '남쪽 해안의 넓은 모래 해변으로, 파도가 좋아 서핑도 즐겨요.' },
  { id: 'suwolbong', name: '수월봉', cat: 'coast', lon: 126.165, lat: 33.294, desc: '화산 활동의 흔적이 층층이 드러난 해안 절벽이에요. 지질 명소로 알려져 있어요.' },
  { id: 'udo', name: '우도', cat: 'coast', lon: 126.953, lat: 33.506, desc: '소가 누운 모습을 닮은 섬이에요. 성산항에서 배로 건너가요.' },
  { id: 'haengwon', name: '행원 풍력발전단지', cat: 'wind', lon: 126.8, lat: 33.55, desc: '바람이 센 북동쪽 해안에서 풍력발전기가 돌아가는 곳이에요.' },
  { id: 'dodu', name: '도두봉·도두등대', cat: 'wind', lon: 126.469, lat: 33.51, desc: '공항 가까이에 있는 작은 봉우리로, 바다를 향한 등대가 있어요.' },
  { id: 'jejuhang', name: '제주항', cat: 'port', lon: 126.543, lat: 33.522, desc: '제주의 북쪽 관문이 되는 항구예요.' },
  { id: 'hallimhang', name: '한림항', cat: 'port', lon: 126.262, lat: 33.414, desc: '서쪽 해안의 항구로, 비양도로 가는 배가 떠나요.' },
  { id: 'mokgwana', name: '제주목 관아', cat: 'culture', lon: 126.5276, lat: 33.5136, desc: '옛 제주목의 관청 터예요. 돌하르방을 가까이에서 볼 수 있어요.' },
  { id: 'seogwipo', name: '서귀포 감귤밭', cat: 'orchard', lon: 126.56, lat: 33.28, desc: '따뜻한 남쪽 비탈에는 감귤밭이 펼쳐져요. 겨울이면 주황빛으로 물들어요.' },
  { id: 'namwon', name: '남원 감귤밭', cat: 'orchard', lon: 126.72, lat: 33.285, desc: '남동쪽 해안 가까이의 감귤 재배지예요.' }
];

// ---- 기상청 격자 변환 (위·경도 → nx, ny) ----
function toGrid(lat, lon) {
  const D = Math.PI / 180, re = 6371.00877 / 5, s1 = 30 * D, s2 = 60 * D, o = 126 * D, oa = 38 * D;
  let sn = Math.tan(Math.PI * 0.25 + s2 * 0.5) / Math.tan(Math.PI * 0.25 + s1 * 0.5);
  sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + s1 * 0.5); sf = Math.pow(sf, sn) * Math.cos(s1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + oa * 0.5); ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * D * 0.5); ra = re * sf / Math.pow(ra, sn);
  let th = lon * D - o; if (th > Math.PI) th -= 2 * Math.PI; if (th < -Math.PI) th += 2 * Math.PI; th *= sn;
  return { nx: Math.floor(ra * Math.sin(th) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(th) + 136 + 0.5) };
}
const PTY = { 0: ['☀️', '강수 없음'], 1: ['🌧️', '비'], 2: ['🌨️', '비/눈'], 3: ['❄️', '눈'], 5: ['🌦️', '빗방울'], 6: ['🌨️', '빗방울/눈날림'], 7: ['❄️', '눈날림'] };
const windDir = d => ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(d / 45) % 8];
const wxCache = new Map();
function fetchWeather(lat, lon) {
  const { nx, ny } = toGrid(lat, lon), k = nx + ',' + ny;
  if (!wxCache.has(k)) {
    wxCache.set(k, fetch(`/api/weather?nx=${nx}&ny=${ny}`).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.message || '날씨 오류'); return j; })
      .catch(e => { wxCache.delete(k); throw e; }));
  }
  return wxCache.get(k);
}
function weatherHtml(j) {
  const v = j.values, [emoji, label] = PTY[Number(v.PTY || 0)] || ['🌤️', '정보 없음'];
  return `<span class="wx">${emoji} <b>${esc(v.T1H)}°C</b> · ${esc(label)} · 습도 ${esc(v.REH)}% · ${esc(windDir(Number(v.VEC)))}풍 ${esc(v.WSD)}m/s <small>(${esc(j.base.time.slice(0, 2))}:00 기상청 실황)</small></span>`;
}

// ---- 지형 만들기 ----
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const [HX, HN] = toXN(126.533, 33.362);           // 한라산 위치
const [UX, UN] = toXN(126.953, 33.506);           // 우도 위치
const BUMPS = (() => {                             // 작은 오름들을 섬 위에 흩뿌려요
  const rnd = mulberry32(7), out = [];
  LANDMARKS.filter(l => l.cat === 'mt' && l.id !== 'hallasan').forEach(l => { const [x, n] = toXN(l.lon, l.lat); out.push({ x, n, h: l.id === 'sanbang' ? 0.4 : l.id === 'seongsan' ? 0.2 : 0.35, s: l.id === 'sanbang' ? 1.3 : 1.5 }); });
  for (let k = 0; k < 90; k++) {
    const x = (rnd() * 2 - 1) * 34, n = (rnd() * 2 - 1) * 14;
    if (Math.hypot(x - HX, n - HN) < 6) continue;
    out.push({ x, n, h: 0.08 + rnd() * 0.25, s: 0.8 + rnd() * 0.9 });
  }
  return out;
})();

function heightKm(x, n) {
  const zp = n - x * TILT;                         // 섬을 살짝 기울여 동쪽이 북쪽으로 올라가게
  let d = Math.pow(Math.pow(Math.abs(x / 40.5), 2.6) + Math.pow(Math.abs(zp / 19), 2.6), 1 / 2.6);
  d += 0.035 * Math.sin(x * 0.42 + n * 0.21) + 0.025 * Math.sin(x * 0.95 - n * 0.6) + 0.015 * Math.sin(n * 1.7 + x * 0.3);
  const land = 1 - d;
  let h = land < 0 ? Math.max(-0.6, land * 1.5) : Math.min(land * 4, 0.3);
  if (land > -0.02) {
    const r = Math.hypot(x - HX, n - HN), m = smooth(-0.02, 0.05, land);
    let f = 1.95 * Math.exp(-Math.pow(r / 7.5, 1.7)) + 0.35 * Math.exp(-Math.pow(r / 20, 2)) - 0.12 * Math.exp(-Math.pow(r / 0.8, 2));
    for (const b of BUMPS) { const dd = Math.hypot(x - b.x, n - b.n); if (dd < 4 * b.s) f += b.h * Math.exp(-Math.pow(dd / b.s, 2)); }
    h += f * m;
  }
  const du = Math.hypot(x - UX, n - UN);           // 우도는 따로 떨어진 섬
  if (du < 2.6) h = Math.max(h, (1 - du / 2.6) * 0.35);
  return h;
}

const STOPS = [[-0.6, 0x12505e], [-0.02, 0x2f8794], [0.0, 0xe4d7a4], [0.06, 0xd8cf8f], [0.12, 0x86b35a], [0.5, 0x5f9a45], [1.0, 0x3f7a3a], [1.35, 0x7a6e5a], [1.7, 0x9a9283], [2.0, 0xc9c4b8]];
const tmp = new THREE.Color(), tmp2 = new THREE.Color();
function colorAt(h, out) {
  for (let i = 1; i < STOPS.length; i++) {
    if (h <= STOPS[i][0] || i === STOPS.length - 1) {
      const [h0, c0] = STOPS[i - 1], [h1, c1] = STOPS[i], t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
      return out.copy(tmp.setHex(c0)).lerp(tmp2.setHex(c1), t);
    }
  }
  return out;
}

// ---- 특징을 살린 3D 소품 (감귤나무·해변 파라솔과 파도·항구의 배·풍력발전기·등대·돌하르방·백록담·숲) ----
function buildProps(scene) {
  const groups = {}, ticks = [];
  const grp = k => groups[k] || (groups[k] = (() => { const g = new THREE.Group(); scene.add(g); return g; })());
  const hy = (x, n) => Math.max(0, heightKm(x, n)) * EXAG;
  const rnd = mulberry32(99), dummy = new THREE.Object3D();
  const std = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
  const mesh = (geo, color, extra) => new THREE.Mesh(geo, std(color, extra));
  const offshore = (x, n) => {                        // 바다 쪽 방향 (높이가 가장 낮은 쪽)
    let best = 0, bh = Infinity;
    for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2, h = heightKm(x + Math.cos(t) * 2, n + Math.sin(t) * 2); if (h < bh) { bh = h; best = t; } }
    return { dx: Math.cos(best), dn: Math.sin(best) };
  };
  const put = (o, x, n, dy = 0) => { o.position.set(x, hy(x, n) + dy, -n); return o; };
  const LM = id => { const l = LANDMARKS.find(k => k.id === id); return toXN(l.lon, l.lat); };

  // 1) 숲: 중산간 경사면에 작은 침엽수
  { const geo = new THREE.ConeGeometry(0.07, 0.26, 5).translate(0, 0.13, 0), im = new THREE.InstancedMesh(geo, std(0xffffff), 700), c = new THREE.Color();
    let k = 0;
    for (let tries = 0; tries < 6000 && k < 700; tries++) {
      const x = (rnd() * 2 - 1) * 38, n = (rnd() * 2 - 1) * 16, h = heightKm(x, n);
      if (h < 0.14 || h > 1.15) continue;
      const s = 0.7 + rnd() * 0.7; dummy.position.set(x, h * EXAG - 0.02, -n); dummy.scale.set(s, s * (0.8 + rnd() * 0.5), s); dummy.rotation.y = rnd() * 6; dummy.updateMatrix();
      im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, c.setHSL(0.3 + rnd() * 0.05, 0.45, 0.2 + rnd() * 0.1)); k++;
    }
    im.count = k; grp('forest').add(im); }

  // 2) 감귤밭: 줄지어 선 감귤나무(초록 수관 + 주황 열매)
  { const patches = [LM('seogwipo'), LM('namwon'), toXN(126.46, 33.292), toXN(126.64, 33.298), toXN(126.40, 33.315)];
    const canopyG = new THREE.SphereGeometry(0.15, 8, 6), fruitG = new THREE.SphereGeometry(0.04, 6, 5);
    const spots = [];
    patches.forEach(([px, pn]) => { for (let i = -3; i <= 2; i++) for (let j = -3; j <= 2; j++) {
      const x = px + i * 0.4 + (rnd() - 0.5) * 0.08, n = pn + j * 0.4 + (rnd() - 0.5) * 0.08, h = heightKm(x, n);
      if (h > 0.04 && h < 0.75) spots.push([x, n]);
    } });
    const canopy = new THREE.InstancedMesh(canopyG, std(0x4f9a3a), spots.length), fruit = new THREE.InstancedMesh(fruitG, std(0xf08a00, { emissive: 0x4a2400 }), spots.length * 4);
    spots.forEach(([x, n], i) => {
      const y = hy(x, n);
      dummy.position.set(x, y + 0.14, -n); dummy.scale.set(1, 0.85, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); canopy.setMatrixAt(i, dummy.matrix);
      for (let f = 0; f < 4; f++) { const a = rnd() * 6.28, e = 0.2 + rnd() * 0.9;
        dummy.position.set(x + Math.cos(a) * 0.14 * Math.cos(e), y + 0.14 + 0.13 * Math.sin(e), -n + Math.sin(a) * 0.14 * Math.cos(e)); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); fruit.setMatrixAt(i * 4 + f, dummy.matrix); }
    });
    grp('orchard').add(canopy, fruit); }

  // 3) 해변: 파라솔 + 밀려오는 파도
  const waves = [];
  const addRings = (cat, x, n, d) => { for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x + d.dx * 1.1, 0.07, -(n + d.dn * 1.1)); m.userData = { i }; waves.push(m); grp(cat).add(m); } };
  LANDMARKS.filter(l => l.cat === 'coast').forEach(l => {
    const [x, n] = toXN(l.lon, l.lat), d = offshore(x, n);
    addRings('coast', x, n, d);
    if (l.id === 'udo' || l.id === 'suwolbong') return;                      // 절벽·섬에는 파라솔 없이 파도만
    const colors = [0xe5484d, 0xf7c948, 0x3b82f6, 0xffffff, 0xff8a3d, 0x2fb67c];
    for (let k = 0; k < 6; k++) {
      const px = x - d.dx * (0.25 + rnd() * 0.5) + (rnd() - 0.5) * 0.9 * -d.dn, pn = n - d.dn * (0.25 + rnd() * 0.5) + (rnd() - 0.5) * 0.9 * d.dx;
      const u = new THREE.Group();
      const pole = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), 0xdddddd); pole.position.y = 0.15;
      const top = mesh(new THREE.ConeGeometry(0.2, 0.12, 8), colors[k]); top.position.y = 0.32;
      u.add(pole, top); put(u, px, pn); u.rotation.z = (rnd() - 0.5) * 0.3; grp('coast').add(u);
    }
  });

  // 4) 항·포구: 부두 + 떠 있는 배
  const boats = [];
  LANDMARKS.filter(l => l.cat === 'port' || l.id === 'udo').forEach(l => {
    const [x, n] = toXN(l.lon, l.lat), d = offshore(x, n), g = l.cat === 'port' ? 'port' : 'coast';
    if (l.cat === 'port') {
      addRings('port', x, n, d);
      const pier = mesh(new THREE.BoxGeometry(1.2, 0.06, 0.14), 0x8a6b4a);
      pier.position.set(x + d.dx * 0.45, 0.1, -(n + d.dn * 0.45)); pier.rotation.y = -Math.atan2(-d.dn, d.dx); grp('port').add(pier);
    }
    for (let k = 0; k < (l.cat === 'port' ? 4 : 2); k++) {
      const b = new THREE.Group(), hull = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.18), k % 2 ? 0x3d5a80 : 0xe5484d), sail = mesh(new THREE.ConeGeometry(0.11, 0.32, 4), 0xffffff);
      sail.position.set(-0.02, 0.2, 0); b.add(hull, sail);
      const r = 1.1 + k * 0.45, a = Math.atan2(d.dn, d.dx) + (k - 1.5) * 0.35;
      b.position.set(x + Math.cos(a) * r, 0.08, -(n + Math.sin(a) * r)); b.rotation.y = rnd() * 6; b.userData = { bx: b.position.x, bz: b.position.z, ph: rnd() * 6 };
      boats.push(b); grp(g).add(b);
    }
  });

  // 5) 풍력발전기 (행원) + 등대 (도두봉)
  const rotors = [];
  { const [x0, n0] = LM('haengwon'), d = offshore(x0, n0), tx = -d.dn, tn = d.dx;
    for (let k = -3; k <= 2; k++) {
      const x = x0 + tx * k * 0.9 - d.dx * 0.5, n = n0 + tn * k * 0.9 - d.dn * 0.5, t = new THREE.Group();
      const tower = mesh(new THREE.CylinderGeometry(0.025, 0.045, 1.2, 8), 0xf2f2f2); tower.position.y = 0.6;
      const rotor = new THREE.Group(); rotor.position.set(0, 1.22, 0.06);
      for (let b = 0; b < 3; b++) { const bl = mesh(new THREE.BoxGeometry(0.05, 0.6, 0.012), 0xffffff); bl.geometry.translate(0, 0.3, 0); bl.rotation.z = b * 2.094; rotor.add(bl); }
      const hub = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0xdddddd); hub.position.set(0, 1.22, 0.04);
      t.add(tower, rotor, hub); put(t, x, n); grp('wind').add(t); rotors.push(rotor);
    }
    const [lx, ln] = LM('dodu'), L = new THREE.Group();
    const tw = mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.9, 10), 0xffffff); tw.position.y = 0.45;
    const band = mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.14, 10), 0xe5484d); band.position.y = 0.45;
    const lamp = mesh(new THREE.SphereGeometry(0.09, 10, 8), 0xfff2a8, { emissive: 0xffd34d }); lamp.position.y = 1.0;
    const cap = mesh(new THREE.ConeGeometry(0.1, 0.12, 10), 0xe5484d); cap.position.y = 1.12;
    L.add(tw, band, lamp, cap); put(L, lx, ln, 0.9); grp('wind').add(L);
    ticks.push(t => { lamp.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 3); }); }

  // 6) 돌하르방 (제주목 관아 앞)
  { const [mx, mn] = LM('mokgwana');
    [-0.25, 0.25].forEach(off => {
      const s = new THREE.Group(), stone = 0x55565c;
      const body = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.42, 10), stone); body.position.y = 0.21;
      const head = mesh(new THREE.SphereGeometry(0.12, 10, 8), stone); head.position.y = 0.55;
      const hat = mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.09, 10), stone); hat.position.y = 0.66;
      const nose = mesh(new THREE.BoxGeometry(0.03, 0.05, 0.04), 0x45464b); nose.position.set(0, 0.54, 0.12);
      const arms = mesh(new THREE.BoxGeometry(0.3, 0.05, 0.07), stone); arms.position.set(0, 0.33, 0.1);
      s.add(body, head, hat, nose, arms); s.scale.setScalar(1.6); put(s, mx + off, mn + 0.35); grp('culture').add(s);
    }); }

  // 7) 한라산 백록담
  { const [hx, hn] = toXN(126.533, 33.362), lake = mesh(new THREE.CircleGeometry(0.3, 20).rotateX(-Math.PI / 2), 0x3aa0c0, { transparent: true, opacity: 0.9 });
    lake.position.set(hx, heightKm(hx, hn) * EXAG + 0.03, -hn); grp('mt').add(lake); }

  ticks.push(t => {
    rotors.forEach((r, i) => { r.rotation.z = t * 1.2 + i; });
    boats.forEach(b => { const u = b.userData; b.position.y = 0.08 + Math.sin(t * 1.4 + u.ph) * 0.03; b.position.x = u.bx + Math.sin(t * 0.3 + u.ph) * 0.15; b.rotation.z = Math.sin(t * 1.4 + u.ph) * 0.06; });
    waves.forEach(w => { const ph = (t * 0.22 + w.userData.i / 3) % 1; w.scale.setScalar(0.5 + ph * 1.5); w.material.opacity = 0.5 * (1 - ph); });
  });
  return { groups, tick: t => ticks.forEach(f => f(t)) };
}

// ---- 지도 시작 ----
export function initJejuMap({ canvasHost, chipsEl, infoEl, listEl, noteEl }) {
  const W = () => canvasHost.clientWidth, H = () => canvasHost.clientHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd6eef2);
  scene.fog = new THREE.Fog(0xd6eef2, 90, 190);
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.5, 400);
  camera.position.set(0, 42, 58).multiplyScalar(Math.max(1, 1.5 / camera.aspect));   // 화면이 좁을수록 멀리서 시작해 섬 전체가 보이게

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  canvasHost.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.setSize(W(), H());
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0' });
  canvasHost.appendChild(labels.domElement);

  const controls = new OrbitControls(camera, labels.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 8; controls.maxDistance = 130; controls.maxPolarAngle = 1.42;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x88a0a8, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.1); sun.position.set(-40, 60, 30); scene.add(sun);

  // 땅 (꼭짓점 색으로 높이를 표현)
  const SX = 110, SZ = 56, NX = 275, NZ = 140;
  const geo = new THREE.PlaneGeometry(SX, SZ, NX, NZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), n = -pos.getZ(i), h = heightKm(x, n);
    pos.setY(i, h * EXAG); colorAt(h, c).toArray(col, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // 바다
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 160).rotateX(-Math.PI / 2),
    new THREE.MeshPhongMaterial({ color: 0x35a6ba, transparent: true, opacity: 0.7, shininess: 90, specular: 0xbfe9f0 }));
  sea.position.y = 0.02; scene.add(sea);

  const props = buildProps(scene);

  // ---- 표시 ----
  const markers = [];                 // { data, obj, el }
  let selected = null, fly = null;
  const heightAt = (x, n) => Math.max(0, heightKm(x, n)) * EXAG;

  function showInfo(m) {
    selected = m; markers.forEach(k => k.el.classList.toggle('on', k === m));
    const d = m.data, cat = CATS[d.cat];
    infoEl.innerHTML = `<div class="mi-emoji">${cat ? cat.emoji : '📍'}</div><div><b>${esc(d.name)}</b>${cat ? `<small>${esc(cat.label)}</small>` : '<small>공공데이터</small>'}<p>${esc(d.desc || '')}</p></div>`;
    const wx = document.createElement('div'); wx.className = 'mi-wx'; wx.textContent = '날씨 불러오는 중…'; infoEl.lastElementChild.appendChild(wx);
    fetchWeather(d.lat, d.lon).then(j => { if (selected === m) wx.innerHTML = weatherHtml(j); })
      .catch(() => { if (selected === m) wx.textContent = ''; });   // 키가 없으면 날씨만 빠져요
    const p = m.obj.position;
    const gy = Math.max(0, p.y - 1.4);   // 마커 아래 땅 높이 기준으로 가까이 다가가요
    fly = { target: new THREE.Vector3(p.x, gy, p.z), cam: new THREE.Vector3(p.x, gy + 7, p.z + 9) };
  }
  function addMarker(data, x, n, { small } = {}) {
    const el = document.createElement('button');
    el.className = 'mk' + (small ? ' sm' : ''); el.type = 'button'; el.dataset.cat = data.cat || 'open';
    el.style.setProperty('--c', (CATS[data.cat] || { color: '#b85c00' }).color);
    el.innerHTML = `<span class="mk-i">${(CATS[data.cat] || { emoji: '📍' }).emoji}</span><span class="mk-n">${esc(data.name)}</span>`;
    const obj = new CSS2DObject(el);
    obj.position.set(x, heightAt(x, n) + (small ? 0.7 : 1.4), -n);
    scene.add(obj);
    const m = { data, obj, el }; markers.push(m);
    el.addEventListener('click', ev => { ev.stopPropagation(); showInfo(m); });
    return m;
  }
  LANDMARKS.forEach(l => { const [x, n] = toXN(l.lon, l.lat); addMarker(l, x, n); });

  // 명소 목록 + 필터
  let filter = 'all';
  listEl.innerHTML = LANDMARKS.map(l => `<button type="button" class="chip" data-id="${l.id}">${CATS[l.cat].emoji} ${esc(l.name)}</button>`).join('');
  listEl.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; const m = markers.find(k => k.data.id === b.dataset.id); if (m) showInfo(m); });
  chipsEl.innerHTML = [['all', '전체']].concat(Object.entries(CATS).map(([k, v]) => [k, `${v.emoji} ${v.label}`]))
    .map(([k, t]) => `<button type="button" class="chip${k === 'all' ? ' on' : ''}" data-f="${k}" aria-pressed="${k === 'all'}">${esc(t)}</button>`).join('');
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f;
    chipsEl.querySelectorAll('[data-f]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    Object.entries(props.groups).forEach(([k, g]) => { g.visible = k === 'forest' || filter === 'all' || filter === k; });
    markers.forEach(m => { m.obj.visible = filter === 'all' || m.data.cat === filter || (!m.data.cat && filter === 'all'); });
  });
  showInfo(markers[0]); fly = null;
  infoEl.dataset.ready = '1';

  // ---- 공공데이터(odcloud) 겹쳐 보기: 좌표가 있는 항목만 ----
  (async () => {
    try {
      const r = await fetch('/api/odcloud?perPage=200'); if (!r.ok) return;
      const rows = (await r.json()).data || []; if (!rows.length) return;
      const pts = [];
      for (const row of rows) {
        const keys = Object.keys(row);
        const kLat = keys.find(k => /위도|lat/i.test(k)), kLon = keys.find(k => /경도|lng|lon/i.test(k));
        const kName = keys.find(k => /(명칭|명|이름|name|title)$/i.test(k)) || keys.find(k => /명|name|title/i.test(k));
        if (!kLat || !kLon) continue;
        const lat = parseFloat(row[kLat]), lon = parseFloat(row[kLon]);
        if (!(lat > 33.1 && lat < 33.6 && lon > 126.1 && lon < 127.0)) continue;
        pts.push({ name: String(row[kName] ?? '공공데이터 장소'), lat, lon, desc: '공공데이터포털에서 불러온 장소예요.' });
      }
      pts.forEach(p => { const [x, n] = toXN(p.lon, p.lat); addMarker(p, x, n, { small: true }); });
      noteEl.textContent = pts.length ? `공공데이터포털 자료에서 ${pts.length}곳을 함께 표시했어요. (작은 📍)` : `공공데이터 ${rows.length}건을 불러왔지만 좌표(위도·경도)가 없어 지도에는 표시하지 않았어요.`;
    } catch { /* 키가 없으면 기본 명소만 보여요 */ }
  })();

  // ---- 루프 ----
  let running = false, raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (fly) {
      controls.target.lerp(fly.target, 0.08); camera.position.lerp(fly.cam, 0.06);
      if (controls.target.distanceTo(fly.target) < 0.05 && camera.position.distanceTo(fly.cam) < 0.1) fly = null;
    }
    props.tick(performance.now() / 1000);
    controls.update(); renderer.render(scene, camera); labels.render(scene, camera);
  }
  const start = () => { if (!running) { running = true; frame(); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  controls.addEventListener('start', () => { fly = null; });
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()), { threshold: 0.05 }).observe(canvasHost);
  new ResizeObserver(() => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); labels.setSize(W(), H()); }).observe(canvasHost);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  start();
  return { stop };
}

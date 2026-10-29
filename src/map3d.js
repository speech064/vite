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
    let f = 1.95 * Math.exp(-Math.pow(r / 9, 1.7)) + 0.35 * Math.exp(-Math.pow(r / 20, 2)) - 0.12 * Math.exp(-Math.pow(r / 0.8, 2));
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

// ---- 지도 시작 ----
export function initJejuMap({ canvasHost, chipsEl, infoEl, listEl, noteEl }) {
  const W = () => canvasHost.clientWidth, H = () => canvasHost.clientHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd6eef2);
  scene.fog = new THREE.Fog(0xd6eef2, 90, 190);
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.5, 400);
  camera.position.set(0, 42, 58);

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
    fly = { target: new THREE.Vector3(p.x, 0, p.z), cam: new THREE.Vector3(p.x, 12, p.z + 17) };
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

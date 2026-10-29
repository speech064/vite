import { ICONS, FACTS, CHIPS } from './data.js';
import { searchPhotos } from './api.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => { const s = String(u ?? ''); if (s.startsWith('/') && !s.startsWith('//')) return s; try { const x = new URL(s); return x.protocol === 'https:' ? x.href : '#'; } catch { return '#'; } };
const creditHtml = p => `사진: <a href="${esc(safeUrl(p.page))}" target="_blank" rel="noopener noreferrer">${esc(p.user)}</a> / Pixabay`;

let apiBroken = null;           // API 키가 없거나 서버 오류일 때 안내 문구를 한 번만 보여줘요
function showNotice(err) {
  if (apiBroken) return; apiBroken = err; const n = $('#notice'); n.hidden = false;
  n.innerHTML = err.code === 'missing_key'
    ? '⚠️ 사진을 불러오려면 <b>PIXABAY_API_KEY</b> 환경변수가 필요해요. README의 “환경변수 설정” 절차를 따라 주세요.'
    : `⚠️ ${esc(err.message || '사진을 불러오지 못했어요.')}`;
}

// ---------- 제주 IP 카드 ----------
function renderIcons() {
  $('#iconGrid').innerHTML = ICONS.map(i => `
    <button class="card" data-id="${i.id}" style="--c:${i.color}" aria-label="${esc(i.name)} 자세히 보기">
      <span class="thumb"><span class="ph">${i.emoji}</span></span>
      <span class="body"><b>${esc(i.name)}</b><small>${esc(i.en)}</small><span class="tag">${esc(i.tagline)}</span></span>
    </button>`).join('');
  ICONS.forEach(async i => {
    try {
      const r = await searchPhotos({ q: i.q, perPage: 6, orientation: 'horizontal' });
      const p = r.hits[0]; if (!p) return;
      const th = $(`.card[data-id="${i.id}"] .thumb`);
      th.innerHTML = `<img loading="lazy" decoding="async" src="${esc(safeUrl(p.preview))}" alt="${esc(i.name)} — ${esc(p.tags)}">`;
    } catch (e) { showNotice(e); }
  });
}
$('#iconGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openIcon(c.dataset.id); });

// ---------- 숫자 카드 ----------
$('#factGrid').innerHTML = FACTS.map(f => `<div class="fact"><b>${esc(f.num)}</b><span>${esc(f.label)}</span><small>${esc(f.note)}</small></div>`).join('');

// ---------- 모달 ----------
const modal = $('#modal');
function openModal(html) {
  modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="close" aria-label="닫기">✕</button>${html}</div>`;
  modal.hidden = false; document.body.classList.add('lock'); modal.querySelector('.close').focus();
}
function closeModal() { modal.hidden = true; modal.innerHTML = ''; document.body.classList.remove('lock'); }
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.close')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

async function openIcon(id) {
  const i = ICONS.find(x => x.id === id); if (!i) return;
  openModal(`
    <div class="detail" style="--c:${i.color}">
      <div class="dhead"><span class="em">${i.emoji}</span><div><h3>${esc(i.name)} <small>${esc(i.en)}</small></h3><p class="tag">${esc(i.tagline)}</p></div></div>
      <p class="ddesc">${esc(i.desc)}</p>
      <ul class="dfacts">${i.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="dgallery" id="dg"><p class="loading">사진을 불러오는 중…</p></div>
    </div>`);
  try {
    const r = await searchPhotos({ q: i.q, perPage: 9 });
    const g = $('#dg'); if (!g) return;
    g.innerHTML = r.hits.length ? r.hits.map((p, k) => `<figure data-k="${k}"><img loading="lazy" decoding="async" src="${esc(safeUrl(p.preview))}" alt="${esc(i.name)} — ${esc(p.tags)}"><figcaption>${creditHtml(p)}</figcaption></figure>`).join('') : '<p class="loading">사진을 찾지 못했어요.</p>';
    g.onclick = e => { const f = e.target.closest('figure'); if (f && !e.target.closest('a')) openPhoto(r.hits[+f.dataset.k]); };
  } catch (e) { showNotice(e); const g = $('#dg'); if (g) g.innerHTML = `<p class="loading">${esc(e.message)}</p>`; }
}
function openPhoto(p) {
  openModal(`<figure class="lightbox"><img src="${esc(safeUrl(p.large))}" alt="${esc(p.tags)}"><figcaption>${creditHtml(p)} · <a href="${esc(safeUrl(p.page))}" target="_blank" rel="noopener noreferrer">원본 보기</a></figcaption></figure>`);
}

// ---------- 갤러리(검색) ----------
const gal = { q: 'jeju island', page: 1, hits: [], total: 0, busy: false };
$('#chips').innerHTML = CHIPS.map(([label, q]) => `<button class="chip" data-q="${esc(q)}">${esc(label)}</button>`).join('');
$('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { $('#searchInput').value = b.textContent; runSearch(b.dataset.q); } });
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#searchInput').value.trim(); if (v) runSearch(/jeju|제주/i.test(v) ? v : v + ' jeju'); });
$('#moreBtn').addEventListener('click', () => loadPage(gal.page + 1));
$('#masonry').addEventListener('click', e => { const f = e.target.closest('figure'); if (f && !e.target.closest('a')) openPhoto(gal.hits[+f.dataset.k]); });

function runSearch(q) { gal.q = q; gal.page = 1; gal.hits = []; $('#masonry').innerHTML = '<p class="loading">불러오는 중…</p>'; loadPage(1); }
async function loadPage(page) {
  if (gal.busy) return; gal.busy = true; $('#moreBtn').disabled = true;
  try {
    const r = await searchPhotos({ q: gal.q, page, perPage: 16 });
    gal.page = page; const start = gal.hits.length; gal.hits.push(...r.hits); gal.total = r.totalHits ?? 0;
    const html = r.hits.map((p, k) => `<figure data-k="${start + k}" style="aspect-ratio:${p.w || 4}/${p.h || 3}"><img loading="lazy" decoding="async" src="${esc(safeUrl(p.preview))}" alt="${esc(p.tags)}"><figcaption>${creditHtml(p)}</figcaption></figure>`).join('');
    if (page === 1) $('#masonry').innerHTML = html || '<p class="loading">검색 결과가 없어요. 다른 단어로 찾아볼까요?</p>'; else $('#masonry').insertAdjacentHTML('beforeend', html);
    $('#moreBtn').hidden = !(gal.hits.length < gal.total && page < 20);
  } catch (e) { showNotice(e); if (page === 1) $('#masonry').innerHTML = `<p class="loading">${esc(e.message)}</p>`; }
  gal.busy = false; $('#moreBtn').disabled = false;
}

// ---------- 히어로 배경 ----------
async function loadHero() {
  try {
    const r = await searchPhotos({ q: 'jeju island', perPage: 6, orientation: 'horizontal' });
    const picks = r.hits.slice(0, 3); if (!picks.length) return;
    $('#heroBg').innerHTML = picks.map((p, k) => `<img class="${k === 0 ? 'on' : ''}" src="${esc(safeUrl(p.large || p.preview))}" alt="" ${k ? 'loading="lazy"' : ''}>`).join('');
    const credit = k => { $('#heroCredit').innerHTML = creditHtml(picks[k]); }; credit(0);
    let k = 0; if (picks.length > 1) setInterval(() => { const imgs = $('#heroBg').children; imgs[k].classList.remove('on'); k = (k + 1) % picks.length; imgs[k].classList.add('on'); credit(k); }, 6500);
  } catch (e) { showNotice(e); }
}

// ---------- 상단바 스크롤 효과 ----------
const nav = $('#nav'); const onScroll = () => nav.classList.toggle('solid', scrollY > 40); addEventListener('scroll', onScroll, { passive: true }); onScroll();

renderIcons(); loadHero(); runSearch('jeju island');

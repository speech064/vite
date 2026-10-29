import { ICONS, FACTS, CHIPS } from './data.js';
import { searchPhotos } from './api.js';
import { supabase, hasSupabase } from './supabase.js';
import * as store from './store.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => { const s = String(u ?? ''); if (s.startsWith('/') && !s.startsWith('//')) return s; try { const x = new URL(s); return x.protocol === 'https:' ? x.href : '#'; } catch { return '#'; } };
const creditHtml = p => `사진: <a href="${esc(safeUrl(p.page))}" target="_blank" rel="noopener noreferrer">${esc(p.user)}</a> / Pixabay`;

// ---------- 상태 ----------
const state = { user: null, favs: new Map() };     // favs: photoId -> photo
const registry = new Map();                         // 화면에 나온 사진을 id로 찾기 위한 보관소
const remember = list => list.forEach(p => registry.set(p.id, p));

let apiBroken = null;           // API 키가 없거나 서버 오류일 때 안내 문구를 한 번만 보여줘요
function showNotice(err) {
  if (apiBroken) return; apiBroken = err; const n = $('#notice'); n.hidden = false;
  n.innerHTML = err.code === 'missing_key'
    ? '⚠️ 사진을 불러오려면 <b>PIXABAY_API_KEY</b> 환경변수가 필요해요. README의 “환경변수 설정” 절차를 따라 주세요.'
    : `⚠️ ${esc(err.message || '사진을 불러오지 못했어요.')}`;
}

// ---------- ♥ 버튼 ----------
const heart = p => hasSupabase ? `<button class="heart${state.favs.has(p.id) ? ' on' : ''}" data-pid="${p.id}" aria-label="내 보관함에 저장" title="내 보관함에 저장">♥</button>` : '';
function paintHearts() { document.querySelectorAll('.heart').forEach(b => b.classList.toggle('on', state.favs.has(Number(b.dataset.pid)))); }
async function toggleFav(pid) {
  const p = registry.get(pid); if (!p) return;
  if (!state.user) { openLogin('사진을 저장하려면 먼저 로그인해 주세요.'); return; }
  try {
    if (state.favs.has(pid)) { await store.removeFavorite(pid); state.favs.delete(pid); }
    else { await store.addFavorite(p); state.favs.set(pid, p); }
    paintHearts(); renderSaved();
  } catch (e) { alert('저장하지 못했어요: ' + e.message); }
}
document.addEventListener('click', e => { const b = e.target.closest('.heart'); if (b) { e.stopPropagation(); toggleFav(Number(b.dataset.pid)); } }, true);

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
      $(`.card[data-id="${i.id}"] .thumb`).innerHTML = `<img loading="lazy" decoding="async" src="${esc(safeUrl(p.preview))}" alt="${esc(i.name)} — ${esc(p.tags)}">`;
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

const figure = (p, extra = '') => `<figure data-id="${p.id}" ${extra}><img loading="lazy" decoding="async" src="${esc(safeUrl(p.preview))}" alt="${esc(p.tags)}">${heart(p)}<figcaption>${creditHtml(p)}</figcaption></figure>`;
function bindFigures(box) {   // figure 를 누르면 크게 보기 (♥와 링크는 제외)
  box.onclick = e => { if (e.target.closest('.heart, a')) return; const f = e.target.closest('figure'); if (f) { const p = registry.get(Number(f.dataset.id)); if (p) openPhoto(p); } };
}

async function openIcon(id) {
  const i = ICONS.find(x => x.id === id); if (!i) return;
  openModal(`
    <div class="detail" style="--c:${i.color}">
      <div class="dhead"><span class="em">${i.emoji}</span><div><h3>${esc(i.name)} <small>${esc(i.en)}</small></h3><p class="tag">${esc(i.tagline)}</p></div></div>
      <p class="ddesc">${esc(i.desc)}</p>
      <ul class="dfacts">${i.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="dgallery" id="dg"><p class="loading">사진을 불러오는 중…</p></div>
      ${hasSupabase ? '<div class="comments" id="cm"><h4>💬 한 줄 이야기</h4><div id="cmBody"><p class="loading">불러오는 중…</p></div></div>' : ''}
    </div>`);
  if (hasSupabase) loadComments(i.id);
  try {
    const r = await searchPhotos({ q: i.q, perPage: 9 }); remember(r.hits);
    const g = $('#dg'); if (!g) return;
    g.innerHTML = r.hits.length ? r.hits.map(p => figure(p)).join('') : '<p class="loading">사진을 찾지 못했어요.</p>';
    bindFigures(g);
  } catch (e) { showNotice(e); const g = $('#dg'); if (g) g.innerHTML = `<p class="loading">${esc(e.message)}</p>`; }
}
function openPhoto(p) {
  openModal(`<figure class="lightbox" data-id="${p.id}"><img src="${esc(safeUrl(p.large))}" alt="${esc(p.tags)}">${heart(p)}<figcaption>${creditHtml(p)} · <a href="${esc(safeUrl(p.page))}" target="_blank" rel="noopener noreferrer">원본 보기</a></figcaption></figure>`);
}

// ---------- 한 줄 이야기 (Supabase) ----------
async function loadComments(iconId) {
  const box = $('#cmBody'); if (!box) return;
  try {
    const list = await store.listComments(iconId);
    const form = state.user
      ? `<form class="cmform" id="cmForm"><input name="nick" maxlength="20" required placeholder="별명" value="${esc(localStorage.getItem('nick') || (state.user.email || '').split('@')[0])}"><input name="body" maxlength="200" required placeholder="이 상징에 대한 한 줄 이야기를 남겨 보세요 (200자)"><button class="btn primary" type="submit">등록</button></form>`
      : '<p class="loading"><button class="btn ghost" id="cmLogin" type="button">로그인하고 한 줄 남기기</button></p>';
    box.innerHTML = form + (list.length ? `<ul class="cmlist">${list.map(c => `<li><b>${esc(c.nickname)}</b> <small>${esc(new Date(c.created_at).toLocaleDateString('ko-KR'))}</small>${state.user && c.user_id === state.user.id ? ` <button class="cmdel" data-id="${c.id}" aria-label="삭제">삭제</button>` : ''}<p>${esc(c.body)}</p></li>`).join('')}</ul>` : '<p class="loading">아직 이야기가 없어요. 첫 번째 이야기를 남겨 보세요!</p>');
    const f = $('#cmForm'); if (f) f.onsubmit = async ev => { ev.preventDefault(); const nick = f.nick.value.trim(), body = f.body.value.trim(); if (!nick || !body) return; f.querySelector('button').disabled = true;
      try { localStorage.setItem('nick', nick); await store.addComment(iconId, nick, body); await loadComments(iconId); } catch (e) { alert('등록하지 못했어요: ' + e.message); f.querySelector('button').disabled = false; } };
    const lg = $('#cmLogin'); if (lg) lg.onclick = () => openLogin('한 줄 이야기를 남기려면 로그인해 주세요.');
    box.querySelectorAll('.cmdel').forEach(b => b.onclick = async () => { if (!confirm('이 글을 삭제할까요?')) return; try { await store.deleteComment(b.dataset.id); await loadComments(iconId); } catch (e) { alert('삭제하지 못했어요: ' + e.message); } });
  } catch (e) { box.innerHTML = `<p class="loading">이야기를 불러오지 못했어요. (${esc(e.message)})</p>`; }
}

// ---------- 로그인 (Supabase Auth: 이메일 링크) ----------
function openLogin(msg = '') {
  openModal(`<div class="login"><h3>로그인</h3><p>${esc(msg || '이메일을 입력하면 로그인 링크를 보내 드려요. 비밀번호는 필요 없어요.')}</p>
    <form id="loginForm"><input type="email" name="email" required placeholder="you@example.com" autocomplete="email"><button class="btn primary" type="submit">로그인 링크 받기</button></form><p class="loading" id="loginMsg"></p></div>`);
  $('#loginForm').onsubmit = async e => {
    e.preventDefault(); const btn = e.target.querySelector('button'), msgEl = $('#loginMsg'); btn.disabled = true; msgEl.textContent = '보내는 중…';
    try { await store.sendMagicLink(e.target.email.value.trim()); msgEl.textContent = '✅ 메일을 보냈어요! 메일함에서 링크를 누르면 로그인돼요. (스팸함도 확인해 주세요)'; }
    catch (err) { msgEl.textContent = '보내지 못했어요: ' + err.message; btn.disabled = false; }
  };
}
function updateNav() {
  const b = $('#authBtn'); b.hidden = !hasSupabase; $('#savedLink').hidden = !hasSupabase;
  if (!hasSupabase) return;
  if (state.user) { b.textContent = '로그아웃'; b.title = state.user.email || ''; b.onclick = async () => { await store.signOut(); }; }
  else { b.textContent = '로그인'; b.title = ''; b.onclick = () => openLogin(); }
}

// ---------- 내 보관함 ----------
function renderSaved() {
  const sec = $('#saved'); sec.hidden = !hasSupabase; if (!hasSupabase) return;
  const list = [...state.favs.values()]; remember(list);
  $('#savedSub').textContent = state.user ? (list.length ? `${list.length}장을 저장했어요. 다시 ♥를 누르면 빼요.` : '아직 저장한 사진이 없어요. 사진의 ♥를 눌러 보세요.') : '로그인하면 마음에 드는 사진을 저장할 수 있어요.';
  const g = $('#savedGrid'); g.innerHTML = list.map(p => figure(p, `style="aspect-ratio:${p.w || 4}/${p.h || 3}"`)).join(''); bindFigures(g);
}
async function refreshFavs() {
  state.favs = new Map();
  if (state.user) { try { (await store.listFavorites()).forEach(p => state.favs.set(p.id, p)); } catch (e) { console.warn('보관함을 불러오지 못했어요', e); } }
  renderSaved(); paintHearts();
}
async function setUser(u) { const changed = (state.user?.id || null) !== (u?.id || null); state.user = u; updateNav(); if (changed) { await Promise.all([refreshFavs(), refreshCart()]); if (u && !modal.hidden && $('.login')) closeModal(); } }
async function initAuth() {
  updateNav(); renderSaved(); paintCartBadge(); loadProducts(); if (!hasSupabase) return;
  const { data } = await supabase.auth.getSession(); await setUser(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
}

// ---------- 굿즈 · 장바구니 (Supabase) ----------
const won = n => Number(n).toLocaleString('ko-KR') + '원';
const shop = { products: [], error: '' };
state.cart = [];
async function loadProducts() {
  const sec = $('#shop'), link = $('#shopLink'); sec.hidden = link.hidden = !hasSupabase; if (!hasSupabase) return;
  try { shop.products = await store.listProducts(); shop.error = ''; } catch (e) { shop.error = e.message; }
  renderShop();
}
function renderShop() {
  const g = $('#shopGrid');
  if (shop.error) { g.innerHTML = `<p class="loading">상품을 불러오지 못했어요. Supabase에서 <b>supabase/cart.sql</b>을 실행했는지 확인해 주세요. (${esc(shop.error)})</p>`; return; }
  g.innerHTML = shop.products.length ? shop.products.map(p => `
    <div class="card product" data-pid="${esc(p.id)}" style="--c:#0e7c86">
      <span class="thumb"><span class="ph">${esc(p.emoji || '🛍️')}</span></span>
      <span class="body"><b>${esc(p.name)}</b><small>${esc(p.description || '')}</small><span class="price">${won(p.price)}</span><button class="btn primary addcart" data-pid="${esc(p.id)}">장바구니 담기</button></span>
    </div>`).join('') : '<p class="loading">준비된 상품이 없어요.</p>';
  // 상품 사진: 각 굿즈의 주제(돌하르방·감귤 등)를 Pixabay에서 찾은 "참고 사진"이에요. (실제 굿즈 사진이 아니에요)
  shop.products.forEach(async p => {
    const icon = ICONS.find(i => i.id === p.icon_id); if (!icon) return;
    try {
      const r = await searchPhotos({ q: icon.q, perPage: 6, orientation: 'horizontal' });
      const ph = r.hits[1] || r.hits[0]; if (!ph) return;
      const th = $(`.product[data-pid="${CSS.escape(p.id)}"] .thumb`); if (!th) return;
      th.innerHTML = `<img loading="lazy" decoding="async" src="${esc(safeUrl(ph.preview))}" alt="${esc(p.name)} 참고 사진 — ${esc(ph.tags)}"><span class="pbadge">${esc(p.emoji || '')}</span><span class="pcredit">참고 사진 · ${esc(ph.user)} / Pixabay</span>`;
    } catch (e) { showNotice(e); }
  });
}
$('#shopGrid').addEventListener('click', e => { const b = e.target.closest('.addcart'); if (b) addToCart(b.dataset.pid, b); });

const cartCount = () => state.cart.reduce((n, c) => n + c.quantity, 0);
const cartTotal = () => state.cart.reduce((n, c) => n + c.quantity * (c.product?.price || 0), 0);
function paintCartBadge() { $('#cartBtn').hidden = !hasSupabase; $('#cartCount').textContent = cartCount(); }
async function refreshCart() {
  state.cart = []; if (state.user) { try { state.cart = await store.listCart(); } catch (e) { console.warn('장바구니를 불러오지 못했어요', e); } }
  paintCartBadge(); if (!modal.hidden && $('.cartbox')) renderCart();
}
async function setQty(productId, qty) {
  await store.setCartQty(state.user.id, productId, qty); await refreshCart();
}
async function addToCart(pid, btn) {
  if (!state.user) { openLogin('장바구니에 담으려면 로그인해 주세요.'); return; }
  const cur = state.cart.find(c => c.product?.id === pid)?.quantity || 0;
  if (cur >= 20) { alert('한 상품은 20개까지 담을 수 있어요.'); return; }
  try { if (btn) btn.disabled = true; await setQty(pid, cur + 1); if (btn) { btn.textContent = '담았어요 ✓'; setTimeout(() => { btn.textContent = '장바구니 담기'; btn.disabled = false; }, 900); } }
  catch (e) { if (btn) btn.disabled = false; alert('담지 못했어요: ' + e.message); }
}
function renderCart() {
  const box = $('.cartbox'); if (!box) return;
  box.innerHTML = state.cart.length ? `
    <ul class="cartlist">${state.cart.map(c => `<li data-id="${c.id}" data-pid="${esc(c.product?.id)}"><span class="em">${esc(c.product?.emoji || '🛍️')}</span><div class="ci"><b>${esc(c.product?.name)}</b><small>${won(c.product?.price || 0)}</small></div>
      <div class="qty"><button data-act="dec" aria-label="하나 줄이기">−</button><span>${c.quantity}</span><button data-act="inc" aria-label="하나 늘리기">＋</button></div><b class="line">${won(c.quantity * (c.product?.price || 0))}</b><button class="cmdel" data-act="del">삭제</button></li>`).join('')}</ul>
    <div class="carttotal"><span>합계 (${cartCount()}개)</span><b>${won(cartTotal())}</b></div>
    <div class="cartact"><button class="btn ghost" data-act="clear">모두 비우기</button><button class="btn primary" disabled title="체험용이라 결제는 지원하지 않아요">주문하기 (체험용)</button></div>
    <p class="loading">※ 데모라서 실제 결제·배송은 이루어지지 않아요.</p>` : '<p class="loading">장바구니가 비어 있어요. 마음에 드는 굿즈를 담아 보세요!</p>';
}
function openCart() {
  if (!state.user) { openLogin('장바구니를 보려면 로그인해 주세요.'); return; }
  openModal('<div class="cartwrap"><h3>🛒 장바구니</h3><div class="cartbox"></div></div>'); renderCart();
  $('.cartbox').onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const li = b.closest('li'), act = b.dataset.act;
    try {
      if (act === 'clear') { if (!confirm('장바구니를 모두 비울까요?')) return; for (const c of state.cart) await store.removeCartItem(c.id); await refreshCart(); return; }
      const c = state.cart.find(x => String(x.id) === li?.dataset.id); if (!c) return;
      if (act === 'del') { await store.removeCartItem(c.id); await refreshCart(); }
      else if (act === 'inc') { if (c.quantity < 20) await setQty(c.product.id, c.quantity + 1); }
      else if (act === 'dec') { if (c.quantity > 1) await setQty(c.product.id, c.quantity - 1); else { await store.removeCartItem(c.id); await refreshCart(); } }
    } catch (err) { alert('처리하지 못했어요: ' + err.message); }
  };
}
$('#cartBtn').addEventListener('click', openCart);

// ---------- 갤러리(검색) ----------
const gal = { q: 'jeju island', page: 1, hits: [], total: 0, busy: false };
$('#chips').innerHTML = CHIPS.map(([label, q]) => `<button class="chip" data-q="${esc(q)}">${esc(label)}</button>`).join('');
$('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { $('#searchInput').value = b.textContent; runSearch(b.dataset.q); } });
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#searchInput').value.trim(); if (v) runSearch(/jeju|제주/i.test(v) ? v : v + ' jeju'); });
$('#moreBtn').addEventListener('click', () => loadPage(gal.page + 1));
bindFigures($('#masonry'));

function runSearch(q) { gal.q = q; gal.page = 1; gal.hits = []; $('#masonry').innerHTML = '<p class="loading">불러오는 중…</p>'; loadPage(1); }
async function loadPage(page) {
  if (gal.busy) return; gal.busy = true; $('#moreBtn').disabled = true;
  try {
    const r = await searchPhotos({ q: gal.q, page, perPage: 16 });
    gal.page = page; gal.hits.push(...r.hits); gal.total = r.totalHits ?? 0; remember(r.hits);
    const html = r.hits.map(p => figure(p, `style="aspect-ratio:${p.w || 4}/${p.h || 3}"`)).join('');
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

initAuth(); renderIcons(); loadHero(); runSearch('jeju island');

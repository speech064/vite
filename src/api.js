// /api/pixabay 호출 + 브라우저 메모리/세션 캐시 (같은 검색은 다시 요청하지 않아요)
const mem = new Map();

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function searchPhotos({ q, page = 1, perPage = 12, orientation = 'all' }) {
  const params = new URLSearchParams({ q, page: String(page), per_page: String(perPage), orientation });
  const key = params.toString();
  if (mem.has(key)) return mem.get(key);
  try { const hit = sessionStorage.getItem('pb:' + key); if (hit) { const v = JSON.parse(hit); mem.set(key, v); return v; } } catch { /* 저장소를 못 쓰면 무시 */ }

  let res;
  try { res = await fetch('/api/pixabay?' + key); } catch { throw new ApiError('network', '서버에 연결하지 못했어요.'); }
  let body = null;
  try { body = await res.json(); } catch { /* JSON이 아니면 아래에서 처리 */ }
  if (!res.ok || !body || !Array.isArray(body.hits)) throw new ApiError(body?.error || 'unknown', body?.message || '사진을 불러오지 못했어요.');

  mem.set(key, body);
  try { sessionStorage.setItem('pb:' + key, JSON.stringify(body)); } catch { /* 용량 초과 등은 무시 */ }
  return body;
}

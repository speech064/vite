// Pixabay 검색 프록시의 핵심 로직 (Vercel 함수와 로컬 개발 서버가 함께 씀)
// API 키는 서버 쪽 환경변수에만 있고, 브라우저에는 절대 내려가지 않아요.
const ENDPOINT = 'https://pixabay.com/api/';

const clampInt = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export async function handlePixabay(params = {}, key) {
  if (!key) {
    return { status: 500, body: { error: 'missing_key', message: 'PIXABAY_API_KEY 환경변수가 설정되지 않았어요. README의 "환경변수 설정" 절차를 확인해 주세요.' } };
  }

  const q = String(params.q ?? '').trim().slice(0, 100) || 'jeju island';
  const page = clampInt(params.page, 1, 20, 1);
  const perPage = clampInt(params.per_page, 3, 40, 12);
  const orientation = ['all', 'horizontal', 'vertical'].includes(params.orientation) ? params.orientation : 'all';
  const lang = ['ko', 'en'].includes(params.lang) ? params.lang : 'en';

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    key, q, page: String(page), per_page: String(perPage), orientation, lang,
    image_type: 'photo', safesearch: 'true', order: params.order === 'latest' ? 'latest' : 'popular'
  }).toString();

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const status = res.status === 429 ? 429 : 502;
      return { status, body: { error: 'upstream', message: status === 429 ? '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' : 'Pixabay 응답에 문제가 있어요.' } };
    }
    const data = await res.json();
    return {
      status: 200,
      // Pixabay 약관: 검색 결과는 24시간 캐시하도록 안내하고 있어요.
      cache: 'public, s-maxage=86400, stale-while-revalidate=3600',
      body: {
        total: data.total,
        totalHits: data.totalHits,
        hits: (data.hits || []).map(h => ({
          id: h.id, preview: h.webformatURL, large: h.largeImageURL, w: h.imageWidth, h: h.imageHeight,
          tags: h.tags, user: h.user, page: h.pageURL
        }))
      }
    };
  } catch {
    return { status: 502, body: { error: 'network', message: 'Pixabay에 연결하지 못했어요.' } };
  }
}

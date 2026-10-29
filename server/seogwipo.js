// 서귀포시 직영관광지 관람객수 추이 (공공데이터포털 odcloud). 인증키와 API 주소는 서버 환경변수로만 받아요.
//   ODCLOUD_API_KEY      인증키 (제주 지도의 다른 공공데이터와 같은 키여도 돼요)
//   SEOGWIPO_API_URL     데이터 상세 화면의 API 주소 (예: https://api.odcloud.kr/api/<번호>/v1/uddi:<...>)
const ALLOWED_HOSTS = ['api.odcloud.kr', 'apis.data.go.kr'];

export async function handleSeogwipo(query, rawKey, rawUrl) {
  if (!rawKey || !rawUrl) return { status: 500, body: { error: 'missing_env', message: 'ODCLOUD_API_KEY 와 SEOGWIPO_API_URL 환경변수가 필요해요.' } };
  let u;
  try { u = new URL(String(rawUrl).trim()); } catch { return { status: 500, body: { error: 'bad_url', message: 'SEOGWIPO_API_URL 형식이 올바르지 않아요.' } }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { status: 500, body: { error: 'bad_url', message: 'SEOGWIPO_API_URL 은 http(s) 주소여야 해요.' } };
  if (!ALLOWED_HOSTS.includes(u.hostname)) return { status: 500, body: { error: 'bad_url', message: '공공데이터포털 주소(api.odcloud.kr)만 쓸 수 있어요.' } };

  let key = String(rawKey).trim();
  try { if (/%[0-9A-Fa-f]{2}/.test(key)) key = decodeURIComponent(key); } catch { /* 그대로 사용 */ }
  u.searchParams.delete('serviceKey'); u.searchParams.delete('ServiceKey');   // 주소에 키가 같이 붙어 있어도 서버 키를 써요
  const perPage = Math.min(1000, Math.max(1, parseInt(query.perPage, 10) || 500));
  if (!u.searchParams.has('page') && !u.searchParams.has('pageNo')) u.searchParams.set('page', '1');
  if (u.hostname === 'api.odcloud.kr') { u.searchParams.set('perPage', String(perPage)); u.searchParams.set('returnType', 'JSON'); }
  else { u.searchParams.set('numOfRows', String(perPage)); u.searchParams.set('_type', 'json'); }
  const url = `${u.toString()}&serviceKey=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { return { status: 502, body: { error: 'bad_response', message: '응답을 읽지 못했어요.' } }; }
    if (!r.ok) return { status: 502, body: { error: 'upstream', message: j.msg || `공공데이터 오류 (${r.status})` } };
    let rows = Array.isArray(j.data) ? j.data : j.response?.body?.items?.item;
    if (rows && !Array.isArray(rows)) rows = [rows];
    return { status: 200, cache: 's-maxage=3600, stale-while-revalidate=86400', body: { data: rows || [] } };
  } catch {
    return { status: 502, body: { error: 'network', message: '공공데이터에 연결하지 못했어요.' } };
  }
}

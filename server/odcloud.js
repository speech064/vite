// 공공데이터포털(odcloud) 제주 데이터 호출 로직. 인증키는 서버에서만 써요.
const URL_BASE = 'https://api.odcloud.kr/api/15125100/v1/uddi:32a1b877-af20-4505-a76a-fd389ebd30ca';

export async function handleOdcloud(query, rawKey) {
  if (!rawKey) return { status: 500, body: { error: 'missing_key', message: 'ODCLOUD_API_KEY 환경변수가 없어요.' } };
  let key = String(rawKey).trim();
  try { if (/%[0-9A-Fa-f]{2}/.test(key)) key = decodeURIComponent(key); } catch { /* 그대로 사용 */ }
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(query.perPage, 10) || 100));
  const url = `${URL_BASE}?page=${page}&perPage=${perPage}&returnType=JSON&serviceKey=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { return { status: 502, body: { error: 'bad_response', message: '응답을 읽지 못했어요.' } }; }
    if (!r.ok) return { status: 502, body: { error: 'upstream', message: j.msg || `공공데이터 오류 (${r.status})` } };
    return { status: 200, cache: 's-maxage=3600, stale-while-revalidate=86400', body: { data: Array.isArray(j.data) ? j.data : [], total: j.totalCount ?? null } };
  } catch {
    return { status: 502, body: { error: 'network', message: '공공데이터에 연결하지 못했어요.' } };
  }
}

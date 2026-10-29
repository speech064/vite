// 기상청 초단기실황(getUltraSrtNcst) 호출 로직. 인증키는 서버에서만 써요.
const ENDPOINT = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

// 한국 시간 기준 base_date/base_time. 실황은 매시 정각 자료가 40분 이후에 올라와요.
function baseTime(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  if (kst.getUTCMinutes() < 40) kst.setUTCHours(kst.getUTCHours() - 1);
  const p = n => String(n).padStart(2, '0');
  return { date: `${kst.getUTCFullYear()}${p(kst.getUTCMonth() + 1)}${p(kst.getUTCDate())}`, time: `${p(kst.getUTCHours())}00` };
}

export async function handleWeather(query, rawKey) {
  if (!rawKey) return { status: 500, body: { error: 'missing_key', message: 'DATA_GO_KR_KEY 환경변수가 없어요.' } };
  const nx = parseInt(query.nx, 10), ny = parseInt(query.ny, 10);
  if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx < 1 || nx > 149 || ny < 1 || ny > 253) return { status: 400, body: { error: 'bad_request', message: 'nx, ny 가 필요해요.' } };
  let key = String(rawKey).trim();
  try { if (/%[0-9A-Fa-f]{2}/.test(key)) key = decodeURIComponent(key); } catch { /* 그대로 사용 */ }
  const { date, time } = baseTime();
  const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&pageNo=1&numOfRows=10&dataType=JSON&base_date=${date}&base_time=${time}&nx=${nx}&ny=${ny}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { return { status: 502, body: { error: 'bad_response', message: '기상청 응답을 읽지 못했어요.' } }; }
    const head = j.response?.header;
    if (!head || head.resultCode !== '00') return { status: 502, body: { error: 'upstream', message: head?.resultMsg || '기상청 오류', code: head?.resultCode } };
    const values = {}; (j.response.body?.items?.item || []).forEach(i => { values[i.category] = i.obsrValue; });
    return { status: 200, cache: 's-maxage=600, stale-while-revalidate=300', body: { base: { date, time }, values } };
  } catch {
    return { status: 502, body: { error: 'network', message: '기상청에 연결하지 못했어요.' } };
  }
}

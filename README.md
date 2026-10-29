# 제주의 얼굴들 · 제주 IP 탐험

돌하르방, 감귤, 한라산, 해녀, 제주마, 현무암 돌담, 동백꽃, 유채꽃 — 제주를 대표하는 IP(이야기와 상징)를
**Pixabay 사진**과 함께 둘러보는 사이트예요. **Vite**(바닐라 JS) + **Vercel** + **Supabase**로 만들었어요.

- 🖼️ 사진: Pixabay API (서버리스 함수로 키를 숨기고 24시간 캐시)
- 🔐 로그인: Supabase Auth — **이메일 링크**(비밀번호 없음)
- ♥ 내 보관함: 마음에 드는 사진 저장 (본인만 볼 수 있음)
- 💬 한 줄 이야기: IP마다 짧은 글 남기기 (누구나 읽기, 로그인한 사람만 쓰기)

> Supabase 환경변수를 넣지 않으면 로그인·보관함·한 줄 이야기만 **자동으로 숨겨지고**, 사진 기능은 그대로 동작해요.

## 폴더 구조

```
api/pixabay.js        Vercel 서버리스 함수 (Pixabay 프록시)
server/pixabay.js     Pixabay 호출 로직 (함수와 로컬 개발 서버가 같이 사용)
supabase/schema.sql   Supabase 테이블 + 보안(RLS) 정책 ← SQL Editor 에서 실행
src/                  화면 코드 (data.js 제주 IP 내용 · api.js · supabase.js · store.js · main.js · style.css)
vite.config.js        로컬 개발 때 /api/pixabay 를 흉내 내는 설정 포함
.env.example          환경변수 예시
```

## 필요한 환경변수 3개

| 이름 | 어디서 | 공개 여부 |
|---|---|---|
| `PIXABAY_API_KEY` | Pixabay API 문서 페이지 | **비공개** (서버 함수에서만 사용 — `VITE_` 금지) |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | 공개돼도 됨 |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **anon public** 키 | 공개돼도 됨 (RLS가 보호) |

> ⚠️ `service_role` 키는 어디에도 넣지 마세요. 그 키는 모든 보안 정책을 무시해요.

---

## 처음부터 설정하는 순서

### 1. Supabase 프로젝트 만들기
1. https://supabase.com 에 로그인 → **New project**.
2. 이름·DB 비밀번호를 정하고 Region 은 가까운 곳(예: Northeast Asia – Seoul)을 골라요. 생성에 1~2분 걸려요.

### 2. 테이블 만들기 (schema.sql 실행)
1. 왼쪽 메뉴 **SQL Editor → New query**.
2. 이 저장소의 `supabase/schema.sql` **전체를 복사해서 붙여 넣고 Run**.
3. `Success` 가 나오면 끝! (**Table Editor** 에서 `favorites`, `comments` 가 보이면 정상이에요.)
   여러 번 실행해도 안전해요.

### 3. Supabase 키 복사
1. **Project Settings(톱니바퀴) → API**.
2. **Project URL** 과 **anon public** 키를 복사해 두세요.

### 4. Pixabay API 키 받기
1. https://pixabay.com 가입/로그인 → https://pixabay.com/api/docs/
2. 문서 상단의 `key` 부분에 내 키가 보여요(로그인 상태여야 해요). 복사해 두세요.

### 5. 로컬에서 실행해 보기 (선택)
```bash
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
# .env.local 을 열어 3개 값을 채우기
npm install
npm run dev                      # http://localhost:5173
```
로컬에서 로그인 링크를 쓰려면 아래 7단계의 Redirect URLs 에 `http://localhost:5173/**` 도 넣어 주세요.

### 6. Vercel 에 배포 + 환경변수 3개 등록
1. https://vercel.com → **Add New… → Project** → 이 GitHub 저장소 **Import**.
   (저장소 루트가 곧 프로젝트라서 **Root Directory 설정은 필요 없어요**. Framework 는 Vite 로 자동 인식돼요.)
2. **Environment Variables** 에 3개를 각각 추가해요. Environments 는 **Production · Preview · Development 모두 체크**.
   - `PIXABAY_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Deploy**.
4. 이미 배포한 뒤에 추가/수정했다면: **Deployments → 최신 배포 ⋯ → Redeploy** 를 눌러야 반영돼요.
   (`VITE_` 로 시작하는 값은 **빌드할 때** 코드에 들어가기 때문에, 바꾸면 꼭 재배포해야 해요.)

### 7. Supabase 에 배포 주소 등록 (로그인 링크가 동작하려면 필수!)
1. Supabase → **Authentication → URL Configuration**.
2. **Site URL** 에 Vercel 배포 주소를 넣어요. 예: `https://내프로젝트.vercel.app`
3. **Redirect URLs** 에 아래를 추가해요.
   - `https://내프로젝트.vercel.app/**`
   - `http://localhost:5173/**` (로컬 테스트용)
4. 저장. (여기를 빠뜨리면 메일 링크를 눌러도 로그인이 안 되거나 localhost 로 가요.)

### 8. 확인
- 배포 주소 뒤에 `/api/pixabay?q=jeju` → 사진 JSON 이 나오면 Pixabay 연결 성공.
- 사이트 우측 상단 **로그인** 버튼 → 이메일 입력 → 메일의 링크 클릭 → **로그아웃** 으로 바뀌면 성공.
- 사진의 ♥ 를 눌러 **내 보관함** 에 담기고, 제주 IP 카드 안에서 **한 줄 이야기**를 남겨 보세요.

> 💡 Supabase 기본 메일은 테스트용이라 **시간당 발송 횟수가 매우 적어요**. 로그인 메일이 잘 안 오면 잠시 기다리거나,
> 실제 운영 때는 Authentication → SMTP Settings 에서 직접 메일 서버를 연결하세요.

---

## 명령어

| 명령 | 설명 |
|---|---|
| `npm install` | 패키지 설치 (Node 18 이상) |
| `npm run dev` | 개발 서버 (`/api/pixabay` 포함) |
| `npm run build` | `dist/` 로 빌드 |
| `npm run preview` | 빌드 결과 미리보기 (`/api` 는 없어요 — 사진 확인은 `npm run dev` 나 Vercel 에서) |

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 사진이 안 나오고 노란 경고 띠 | `PIXABAY_API_KEY` 이름·값, Production 체크, 재배포 |
| 로그인/♥ 버튼이 아예 없음 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 후 **재배포** |
| 로그인 링크를 눌렀는데 로그인이 안 됨 | 7단계 Site URL / Redirect URLs |
| ♥ 저장·글쓰기가 "저장하지 못했어요" | 2단계 `schema.sql` 을 실행했는지 (테이블·정책 없음) |

## 내용 수정하기

제주 IP 소개 문장과 검색어는 `src/data.js` 에 있어요. 항목을 추가하면 카드와 상세 화면이 자동으로 늘어나요.

## 사진 이용 안내

사진은 [Pixabay](https://pixabay.com)에서 가져와요. Pixabay 콘텐츠 라이선스와 API 이용 약관을 확인해 주세요.
이 사이트는 사진을 직접 내려받아 보관하지 않고, 검색 결과를 24시간 캐시해서 보여줘요. (♥ 저장은 사진 주소·촬영자 정보만 저장해요.)

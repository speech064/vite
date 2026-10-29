# 제주의 얼굴들 · 제주 IP 탐험

돌하르방, 감귤, 한라산, 해녀, 제주마, 현무암 돌담, 동백꽃, 유채꽃 — 제주를 대표하는 IP(이야기와 상징)를
**Pixabay 사진**과 함께 둘러보는 사이트예요. **Vite**(바닐라 JS)로 만들었고 **Vercel**에 배포해요.

## 어떻게 동작하나요?

```
브라우저 ──(1) /api/pixabay?q=... ──▶ Vercel 서버리스 함수 ──(2) API 키를 붙여 요청 ──▶ Pixabay
        ◀──(4) 사진 정보(JSON) ────        └─(3) 필요한 정보만 골라 24시간 캐시
```

- **API 키는 서버(Vercel 함수)에서만 사용**해요. 브라우저 코드에는 키가 들어가지 않아요.
- 응답은 `Cache-Control: s-maxage=86400`으로 24시간 캐시해서 Pixabay 요청 수를 아껴요(Pixabay 안내 사항).
- 모든 사진에 촬영자(업로더)와 Pixabay 원본 링크를 표시해요.

## 폴더 구조

```
api/pixabay.js      Vercel 서버리스 함수 (배포용 진입점)
server/pixabay.js   Pixabay 호출 로직 (함수와 로컬 개발 서버가 같이 사용)
src/                화면 코드 (data.js = 제주 IP 내용, api.js, main.js, style.css)
public/             favicon
vite.config.js      로컬 개발 때 /api/pixabay 를 흉내 내는 설정 포함
.env.example        환경변수 예시
```

---

## 환경변수 설정 절차 (PIXABAY_API_KEY)

필요한 환경변수는 **딱 하나**예요: `PIXABAY_API_KEY`

### 1단계. Pixabay API 키 받기
1. https://pixabay.com 에 가입하고 로그인해요.
2. https://pixabay.com/api/docs/ 로 이동해요.
3. 문서 중간의 **Parameters → key** 항목 근처에 **내 API 키**가 표시돼요(로그인 상태여야 보여요). 복사해 두세요.

### 2단계. 내 컴퓨터(로컬)에 등록하기
1. 프로젝트 폴더에서 `.env.example` 을 복사해 `.env.local` 파일을 만들어요.
   ```bash
   cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
   ```
2. `.env.local` 을 열어 키를 붙여 넣어요.
   ```
   PIXABAY_API_KEY=복사한_키
   ```
3. 설치하고 실행해요.
   ```bash
   npm install
   npm run dev        # http://localhost:5173
   ```
> `.env.local` 은 `.gitignore` 에 들어 있어서 GitHub에 올라가지 않아요. **절대 `VITE_` 를 앞에 붙이지 마세요.**
> `VITE_` 로 시작하는 변수는 브라우저 코드에 그대로 노출돼요.

### 3단계. Vercel에 배포하고 환경변수 등록하기
1. GitHub에 이 저장소를 올려요(이미 올렸다면 건너뛰기).
2. https://vercel.com → **Add New… → Project** → GitHub 저장소 **Import**.
3. 설정 화면에서 **Framework Preset = Vite** 인지 확인해요(자동 감지돼요). Build Command `npm run build`, Output `dist`.
4. 같은 화면의 **Environment Variables** 에 입력해요.
   - **Key**: `PIXABAY_API_KEY`
   - **Value**: 1단계에서 복사한 키
   - **Environments**: Production · Preview · Development 모두 체크
   - **Add** 를 누르고 **Deploy**.
5. 이미 배포한 뒤에 추가/수정했다면: 프로젝트 **Settings → Environment Variables** 에서 등록하고,
   **Deployments → 최신 배포 ⋯ → Redeploy** 를 눌러야 반영돼요(환경변수는 새 배포부터 적용돼요).

### 4단계. 잘 됐는지 확인하기
- 배포된 주소 뒤에 `/api/pixabay?q=jeju` 를 붙여 열어요. 사진 목록 JSON이 나오면 성공!
- `{"error":"missing_key", ...}` 가 보이면 3단계의 환경변수 이름(`PIXABAY_API_KEY`)·환경(Production)·재배포를 다시 확인해요.

---

## 명령어

| 명령 | 설명 |
|---|---|
| `npm install` | 패키지 설치 (Node 18 이상) |
| `npm run dev` | 개발 서버 (`/api/pixabay` 포함) |
| `npm run build` | `dist/` 로 빌드 |
| `npm run preview` | 빌드 결과 미리보기 (이 모드에서는 `/api` 가 없어요 — 사진 확인은 `npm run dev` 나 Vercel에서) |

## 내용 수정하기

제주 IP 소개 문장과 검색어는 `src/data.js` 에 있어요. 항목을 추가하면 카드와 상세 화면이 자동으로 늘어나요.

## 사진 이용 안내

사진은 [Pixabay](https://pixabay.com)에서 가져와요. Pixabay 콘텐츠 라이선스와 API 이용 약관을 확인해 주세요.
이 사이트는 사진을 직접 내려받아 보관하지 않고, 검색 결과를 24시간 캐시해서 보여줘요.

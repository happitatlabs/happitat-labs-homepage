# Happitat Labs Homepage

React, Vite, TypeScript, CSS Variables 기반의 Happitat Labs 홈페이지입니다.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Path: `/`

This repository uses Cloudflare Workers Static Assets. SPA fallback for product
detail routes is configured in `wrangler.jsonc`.

## Links

실제 대표 노션, 이메일, GitHub 주소는 `src/content.ts`에서 교체합니다.

## Product Routes

제품 목록과 상태, 상세 경로는 `src/content.ts`의 `products` 배열에서 관리합니다.

- `/products/happy-habitat`
- `/products/sql-diagnoser`
- `/products/dot-code-editor`

## Portfolio Guide v0.1

- `src/PortfolioGuide.tsx`: 작은 노트 캐릭터, 질문 선택, 답변, 닫기.
- `src/content.ts`의 `portfolioGuideQuestions`: 공개된 About / Founder / 제품 사례만 사용하는 정적 답변. 제품 설명은 기존 `products` 데이터를 재사용합니다.
- `src/portfolio-guide.css`: 기존 시간대 테마 변수, 모바일 내부 스크롤, reduced-motion 처리.
- 안내원은 외부 요청, 대화 저장, 신규 런타임 의존성을 사용하지 않습니다. 기존 Lab Notes 요청과는 별개입니다.
- 키보드로 열면 첫 질문에 포커스가 이동합니다. Esc 또는 닫기로 캐릭터 버튼에 복귀하며, Tab으로 안내원 밖으로 이동하면 말풍선이 닫힙니다.

### Verification

`npm run build`로 TypeScript와 프로덕션 빌드를 확인합니다.
브라우저 회귀 테스트는 이미 Playwright와 Chromium이 준비된 개발 환경에서 실행합니다. 앱 의존성에는 추가하지 않습니다.

```powershell
npm run dev -- --host 127.0.0.1 --port 4181 --strictPort
# 별도 터미널에서 실행. Playwright가 외부 경로에 있으면 해당 모듈 경로를 지정합니다.
$env:PLAYWRIGHT_MODULE = 'C:/path/to/existing/node_modules/playwright'
node tests/portfolio-guide.cjs
```

`GUIDE_BASE_URL`로 테스트 서버 주소를 바꿀 수 있습니다. 질문 3개, 닫기, 키보드, 모바일 경계, 시간대 테마, reduced-motion, 조작 중 네트워크 요청 부재를 확인합니다. 스크린샷은 Git 제외 대상인 `.tmp-guide-checks/`에 생성합니다.

### TODO (Not Implemented)

- LLM/API/RAG, TTS, Live2D는 후속 버전에서 필요성·공개 데이터 범위·개인정보 처리를 먼저 검토합니다. v0.1에는 연결하지 않습니다.

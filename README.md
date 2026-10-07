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

## Mel: Static Portfolio Guide

- `src/PortfolioGuide.tsx`: 안내봇 이름은 멜입니다. 기존 노트 캐릭터와 아코디언을 유지하며 대표 프로젝트 / 할 수 있는 일 / 사용 기술 / 경력 / 연락하기를 상냥한 한국어 존댓말로 안내합니다.
- `src/content.ts`의 `portfolioGuideQuestions`: 공개된 About / Founder / 제품 사례만 사용하는 정적 답변. 제품 설명은 기존 `products` 데이터를 재사용합니다.
- `src/portfolio-guide.css`: 기존 시간대 테마 변수, 180ms 열기·닫기 전환, 모바일 내부 스크롤, reduced-motion 처리. 대기 중 반복 동작은 없습니다.
- 안내원은 외부 요청, 대화 저장, 신규 런타임 의존성을 사용하지 않습니다. 기존 Lab Notes 요청과는 별개입니다.
- SQL Worker, SQL 로그인, Credits, 결제, Azure OpenAI와 연결하지 않습니다. 홈페이지 저장소와 `happitat-labs-homepage` Worker만 배포 대상으로 사용합니다. 로그인 및 일일 3회 제한은 이번 정적 버전의 기능이 아닙니다.
- 키보드로 열면 첫 선택지에 포커스가 이동합니다. Esc 또는 닫기로 캐릭터 버튼에 복귀하며, Tab으로 안내원 밖으로 이동하면 말풍선이 닫힙니다. 닫기 전환 중 패널은 `inert` 처리됩니다.
- 같은 페이지의 CTA는 기존 헤더 높이를 고려한 hash 스크롤을 재사용하고 목적 섹션에 포커스를 옮깁니다. 다른 페이지의 CTA는 기존 경로로 이동합니다.
- 520px 모바일 분기, safe-area, visual viewport 높이·하단 여백을 반영합니다. 내부만 스크롤되며 닫기 버튼은 스크롤 영역 밖에 고정됩니다. 모든 버튼과 CTA의 터치 높이는 44px 이상입니다.

### CTA Destinations

- 대표 프로젝트: SQL Diagnoser, Happy Habitat, 픽셀정비소 상세 경로와 `/#products`.
- 할 수 있는 일: `/#products`, `/#founder`.
- 사용 기술: `/#process`, SQL 상세의 `#sql-stack`, `#sql-features`, `#sql-ai`, `/#about`.
- 경력: `/#founder`, 기존 대표 Notion URL(새 탭).
- 연락하기: `/#contact`, `links.email`에서 생성하는 `mailto:`.
- GIS / Spatial Data는 현재 공개 페이지에 근거가 없어 안내하지 않습니다.

### Verification

`npm run build`로 TypeScript와 프로덕션 빌드를 확인합니다.
브라우저 회귀 테스트는 이미 Playwright와 Chromium이 준비된 개발 환경에서 실행합니다. 앱 의존성에는 추가하지 않습니다.

```powershell
npm run dev -- --host 127.0.0.1 --port 4181 --strictPort
# 별도 터미널에서 실행. Playwright가 외부 경로에 있으면 해당 모듈 경로를 지정합니다.
$env:PLAYWRIGHT_MODULE = 'C:/path/to/existing/node_modules/playwright'
node tests/portfolio-guide.cjs
```

`GUIDE_BASE_URL`로 테스트 서버 주소를 바꿀 수 있습니다. 선택지 5개, CTA 경로·anchor·터치 크기, 닫기·빠른 재열기, 키보드, 모바일 경계·높이 변경, 시간대 테마, reduced-motion, 안내 중 네트워크 요청 부재를 확인합니다. 같은 hash 재선택과 상세 페이지에서 홈 이동도 검사합니다. 스크린샷은 Git 제외 대상인 `.tmp-guide-checks/`에 생성합니다. 실제 모바일 OS 키보드/브라우저 UI는 별도 실기기 확인 대상입니다.

### TODO (Not Implemented)

- 자유입력, LLM/API/RAG, 음성, 로그인, 사용자 데이터 수집·저장, 대화 기록, Live2D는 구현하지 않습니다. 후속 도입은 별도 범위와 데이터 정책 검토가 필요합니다.

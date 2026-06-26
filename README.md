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

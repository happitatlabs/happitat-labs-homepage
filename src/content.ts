export const links = {
  notion: "https://kimhyein.notion.site/AI-28df11285b02807e839bf0764cdef515",
  email: "hello@happitatlabs.com",
  github: "https://github.com/happitatlabs",
  happyHabitatPlay:
    "https://play.google.com/store/apps/details?id=com.happitatlabs.happyhabitat",
};

export type Product = {
  name: string;
  summary: string;
  detail: string;
  signal: string;
  status: "MVP" | "Validation" | "Google Play";
  path: string;
  updateUrl: string;
  updateLabel: string;
  storeUrl?: string;
  releaseLabel?: string;
  cardCta?: string;
};

export const capabilityTags = [
  "작은 문제",
  "MVP First",
  "실사용 검증",
  "AI Product Engineering",
  "플랫폼 확장",
];

export const processSteps = [
  {
    title: "Problem Finding",
    subtitle: "현장의 문제를 발견",
    description: "일상과 업무 흐름에서 반복되는 작은 불편과 이해 비용을 찾습니다.",
  },
  {
    title: "Rapid MVP",
    subtitle: "빠르게 MVP 제작",
    description: "거대한 플랫폼보다 실제로 써볼 수 있는 작은 도구를 먼저 만듭니다.",
  },
  {
    title: "PMF",
    subtitle: "실사용 검증",
    description: "사용자의 피드백과 반복 사용 흐름을 통해 문제의 크기를 확인합니다.",
  },
  {
    title: "Platform",
    subtitle: "공통 엔진 추출",
    description: "검증된 제품에서 반복되는 구조를 찾아 재사용 가능한 엔진으로 정리합니다.",
  },
  {
    title: "Habitat",
    subtitle: "제품 생태계 구축",
    description: "사람이 오래 사용할 수 있는 제품들이 연결되는 작은 생태계를 만듭니다.",
  },
];

export const products = [
  {
    name: "Happy Habitat",
    summary: "행복, 회복, 성과를 기록하고 한 달의 나를 돌아보는 Android 앱",
    detail:
      "Happy Habitat은 오늘의 행복, 회복, 성과를 기록하고 월말 결산으로 나를 돌아보는 Android 앱입니다. Google Play에서 공개 중이며, 작은 기록이 오래 이어지는지 실제 사용 흐름에서 검증하고 있습니다.",
    signal: "RECORD",
    status: "Google Play",
    path: "/products/happy-habitat",
    updateUrl: links.github,
    updateLabel: "GitHub에서 업데이트 보기",
    storeUrl: links.happyHabitatPlay,
    releaseLabel: "Google Play 공개",
    cardCta: "앱 보기",
  },
  {
    name: "SQL Diagnoser",
    summary: "복잡한 SQL과 레거시 쿼리를 사람이 이해할 수 있는 구조로 바꾸는 MVP",
    detail:
      "SQL Diagnoser는 복잡한 SQL과 레거시 쿼리를 사람이 이해할 수 있는 구조로 해석하는 MVP입니다. 코드의 의도와 다음 행동을 정리해 유지보수자의 이해 비용을 줄이는 방향으로 검증합니다.",
    signal: "ANALYZE",
    status: "MVP",
    path: "/products/sql-diagnoser",
    updateUrl: links.github,
    updateLabel: "GitHub에서 업데이트 보기",
  },
  {
    name: "UI Inspector",
    summary: "사용성 문제를 자동으로 점검하고 개선 지점을 찾는 검증 MVP",
    detail:
      "UI Inspector는 화면과 사용 흐름에서 사용자가 막힐 수 있는 지점을 점검하는 검증 MVP입니다. UI/UX 관찰 기준과 AI 활용 진단 흐름을 결합해 제품 개선의 출발점을 찾습니다.",
    signal: "INSPECT",
    status: "Validation",
    path: "/products/ui-inspector",
    updateUrl: links.github,
    updateLabel: "GitHub에서 업데이트 보기",
  },
] satisfies Product[];

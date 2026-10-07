import { portfolioGuideQuestions, products } from "../src/content.js";

export type MelSource = Readonly<{ title: string; url: string }>;
export type MelAnswer = Readonly<{ id: string; reply: string; sources: readonly MelSource[] }>;

const homepage = "https://happitatlabs.com";
const unknown: MelAnswer = Object.freeze({
  id: "unknown",
  reply: "이 내용은 현재 공개된 자료만으로는 확인하기 어려워요. Happitat Labs의 프로젝트, 작업 방식이나 연락처에 관해 물어봐 주시면 공개된 범위에서 안내해 드릴게요.",
  sources: Object.freeze([]),
});

// Only committed public page content enters this bank. No model text, fetched
// documents, SQL data, private persona or conversation history is interpolated.
const answers: readonly MelAnswer[] = Object.freeze([
  unknown,
  ...portfolioGuideQuestions.map((question) => {
    const actions = [...(question.items ?? []).map((item) => ({
      label: `${item.title}: ${item.action.label}`, href: item.action.href,
    })), ...question.actions];
    const urls = new Set<string>();
    const sources: MelSource[] = [];
    for (const action of actions) {
      const url = new URL(action.href, homepage);
      if (url.protocol !== "https:" || urls.has(url.href)) continue;
      urls.add(url.href);
      sources.push(Object.freeze({ title: action.label, url: url.href }));
    }
    return Object.freeze({
      id: question.id,
      reply: [question.answer, ...(question.items ?? []).map((item) => `${item.title}: ${item.description}`)].join("\n\n"),
      sources: Object.freeze(sources),
    });
  }),
  ...products.map((product) => Object.freeze({
    id: `product-${product.path.split("/").at(-1)}`,
    reply: `${product.name}의 공개 소개를 안내해 드릴게요.\n\n${product.detail}`,
    sources: Object.freeze([Object.freeze({ title: `${product.name} 소개`, url: new URL(product.path, homepage).href })]),
  })),
]);

export const MEL_ANSWER_IDS: readonly string[] = Object.freeze(answers.map((answer) => answer.id));

export function selectionCandidates() {
  return answers.map((answer) => ({ answer_id: answer.id, reviewed_answer: answer.reply }));
}

export function renderSelection(content: string): MelAnswer {
  // Closed, single-field JSON grammar also rejects duplicate keys and prose.
  // JSON.parse still performs the structured decode after that boundary check.
  if (!/^\s*\{\s*"answer_id"\s*:\s*"[a-z0-9-]+"\s*\}\s*$/u.test(content)) return unknown;
  const selected = JSON.parse(content) as { answer_id: string };
  return answers.find((answer) => answer.id === selected.answer_id) ?? unknown;
}

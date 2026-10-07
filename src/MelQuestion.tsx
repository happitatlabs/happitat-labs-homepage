import { useEffect, useRef, useState, type FormEvent } from "react";
import { MelChallenge } from "./MelChallenge";

type Quota = { remaining: number; resetAt: string };
type Answer = { id: string; reply: string; sources: { title: string; url: string }[] };
type Reply = Partial<Quota> & { code?: string; answer?: Answer };
const messages: Record<string, string> = {
  unavailable: "지금은 AI 안내에 연결할 수 없어요. 위의 기본 안내는 계속 이용하실 수 있어요.",
  rate_limited: "요청이 잠시 많아졌어요. 같은 네트워크의 이용량에 따라 제한될 수 있으니 1분 뒤 다시 확인해 주세요.",
  challenge_required: "AI 안내를 시작하기 전에 보안 확인이 필요해요.",
  challenge_failed: "보안 확인 결과를 확인하지 못했어요. 보안 확인을 다시 진행해 주세요.",
  failed: "답변을 가져오지 못했어요. 브라우저의 답변 횟수는 차감하지 않았어요.",
  session_required: "브라우저 확인이 만료됐거나 쿠키가 차단됐어요. 쿠키 설정을 확인한 뒤 ‘확인하고 시작하기’를 눌러 주세요.",
  browser_limit: "오늘 이 브라우저의 AI 안내를 모두 이용하셨어요. 한국시간 자정에 다시 열려요.",
  global_limit: "오늘 준비된 AI 안내가 모두 마감됐어요. 기본 안내를 이용해 주세요.",
  busy: "다른 질문을 확인하고 있어요. 잠시 후 다시 눌러 주세요.",
  pending: "아직 답변을 확인하고 있어요. 잠시 후 ‘답변 확인’을 눌러 주세요.",
  conflict: "질문을 다시 입력해 주세요.",
  invalid_request: "공개 프로젝트에 관한 질문을 1,000자 이내로 입력해 주세요.",
  network: "연결이 끊겨 결과를 확인하지 못했어요. ‘답변 확인’을 누르면 같은 요청의 결과를 확인해요.",
};

function validAnswer(value: unknown): value is Answer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Answer;
  return typeof answer.id === "string" && typeof answer.reply === "string" && answer.reply.length <= 8000
    && Array.isArray(answer.sources) && answer.sources.length <= 12 && answer.sources.every((source) => {
      try {
        const url = new URL(source.url);
        return typeof source.title === "string" && url.protocol === "https:" && !url.username && !url.password
          && ["happitatlabs.com", "www.happitatlabs.com", "kimhyein.notion.site"].includes(url.hostname);
      } catch { return false; }
    });
}

export function MelQuestion() {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [challengeVersion, setChallengeVersion] = useState(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController>();
  const attempt = useRef<{ question: string; id: string }>();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  useEffect(() => {
    if (answer) resultRef.current?.focus({ preventScroll: false });
  }, [answer]);

  async function send(path: "session" | "turn", body: object) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(path === "turn" ? "공개 자료에서 답변을 찾고 있어요." : "남은 횟수를 확인하고 있어요.");
    controller.current = new AbortController();
    const timeout = window.setTimeout(() => controller.current?.abort(), 20_000);
    try {
      const response = await fetch(`/api/mel/${path}`, {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.current.signal,
      });
      const data = await response.json() as Reply;
      if (!mounted.current) return;
      if (Number.isInteger(data.remaining) && data.remaining! >= 0 && data.remaining! <= 3 && data.resetAt && Number.isFinite(Date.parse(data.resetAt))) {
        setQuota({ remaining: data.remaining!, resetAt: data.resetAt });
      }
      if (path === "turn" && response.status === 200 && validAnswer(data.answer)) {
        setAnswer(data.answer);
        setQuestion("");
        setUncertain(false);
        attempt.current = undefined;
        setMessage("공개 자료를 바탕으로 찾은 안내예요. 근거 링크도 확인해 주세요.");
      } else if (path === "session" && response.ok && typeof data.remaining === "number") {
        setNeedsChallenge(false);
        setMessage(data.remaining === 0 ? messages.browser_limit : "질문을 보내시면 공개 자료에서 알맞은 안내를 찾아드려요.");
      } else {
        const pending = data.code === "pending" || (path === "turn" && (!data.code || (uncertain && data.code === "rate_limited")));
        setUncertain(path === "turn" && pending);
        if (!pending) attempt.current = undefined;
        setMessage(messages[data.code ?? "unavailable"] ?? messages.unavailable);
        if (data.code === "session_required") { setQuota(null); setNeedsChallenge(false); }
        if (data.code === "challenge_required" || data.code === "challenge_failed") { setQuota(null); setNeedsChallenge(true); }
      }
    } catch {
      if (mounted.current) {
        setUncertain(path === "turn");
        setMessage(path === "turn" ? messages.network : messages.unavailable);
      }
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !quota || (!uncertain && quota.remaining === 0) || !question.trim()) return;
    const text = question.trim();
    if (!attempt.current || attempt.current.question !== text) attempt.current = { question: text, id: crypto.randomUUID() };
    setAnswer(null);
    void send("turn", { question: text, requestId: attempt.current.id });
  }

  return (
    <div className="guide-ai">
      <button className="guide-question-button" type="button" aria-expanded={expanded} aria-controls="mel-ai-content"
        onClick={() => setExpanded(!expanded)}>
        <span>AI로 질문하기</span><span className="guide-question-symbol" aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <div id="mel-ai-content" hidden={!expanded}>
        <p className="guide-ai-notice">공개 자료 안에서 멜이 안내를 골라드려요. 답변 선택이 정확하지 않을 수 있어요.</p>
        <p className="guide-ai-notice" id="mel-ai-privacy">질문은 Azure AI로 전송돼요. 개인정보와 비공개 자료는 보내지 마세요. 이 서버에는 질문 원문을 저장하지 않으며, Azure의 별도 데이터 처리 정책이 적용돼요.</p>
        <p className="guide-ai-notice">로그인 없이 이 사이트의 브라우저 쿠키 기준 하루 3회, 한국시간 자정 초기화예요. 전체 이용량에 따라 먼저 마감될 수 있어요.</p>
        <p className="guide-ai-notice">시작 시 Cloudflare 보안 확인을 사용해요. IP별 반복 요청은 잠시 제한하며, IP를 AI나 멜 저장소로 전달하지 않아요.</p>
        {!quota ? (
          needsChallenge ? <>
            {expanded && <MelChallenge key={challengeVersion} onVerified={(challenge) => void send("session", { challenge })} />}
            <button className="guide-ai-action" type="button" disabled={busy} onClick={() => setChallengeVersion((value) => value + 1)}>보안 확인 다시 하기</button>
          </> : <button className="guide-ai-action" type="button" disabled={busy} onClick={() => void send("session", {})}>확인하고 시작하기</button>
        ) : (
          <>
            <div className="guide-ai-quota"><span>오늘 남은 답변 {quota.remaining}/3</span>
              <button type="button" disabled={busy} onClick={() => void send("session", {})}>남은 횟수 확인</button>
            </div>
            <form onSubmit={submit}>
              <label htmlFor="mel-ai-question">궁금한 점</label>
              <textarea id="mel-ai-question" value={question} maxLength={1000} rows={3} required aria-describedby="mel-ai-privacy"
                readOnly={busy || uncertain} placeholder="어떤 프로젝트를 만들었나요?"
                onChange={(event) => { setQuestion(event.target.value); attempt.current = undefined; }} />
              <button className="guide-ai-action" type="submit" disabled={busy || (!uncertain && quota.remaining === 0) || !question.trim()}>
                {busy ? "확인 중" : uncertain ? "답변 확인" : "질문 보내기"}
              </button>
            </form>
          </>
        )}
        <p className="guide-ai-status" role="status" aria-live="polite">{message}</p>
        {answer && (
          <div className="guide-ai-answer" ref={resultRef} tabIndex={-1} aria-label="멜의 답변">
            <p>{answer.reply}</p>
            {answer.sources.length > 0 && <nav className="guide-actions" aria-label="답변 근거">
              {answer.sources.map((source) => <a key={source.url} className="guide-cta" href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.title} (새 탭)`}>{source.title} <span aria-hidden="true">↗</span></a>)}
            </nav>}
          </div>
        )}
      </div>
    </div>
  );
}

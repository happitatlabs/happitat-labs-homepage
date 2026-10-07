import { useEffect, useRef, useState } from "react";

// Public widget identifier, never the server-side Turnstile secret.
const sitekey = "0x4AAAAAAFQDkBkgR4dwU33p";
type Turnstile = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }
let loading: Promise<Turnstile> | undefined;

function loadChallenge(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = window.setTimeout(fail, 10_000);
    function fail() {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      script.remove();
      loading = undefined;
      reject(new Error("challenge_unavailable"));
    }
    script.onerror = fail;
    script.onload = () => {
      if (!window.turnstile) { fail(); return; }
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      resolve(window.turnstile);
    };
    document.head.append(script);
  });
  return loading;
}

export function MelChallenge({ onVerified }: { onVerified: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onVerified);
  callback.current = onVerified;
  const [status, setStatus] = useState("보안 확인을 불러오고 있어요.");

  useEffect(() => {
    let cancelled = false;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    void loadChallenge().then((turnstile) => {
      if (cancelled || !container.current) return;
      api = turnstile;
      widget = turnstile.render(container.current, {
        sitekey, action: "mel_session", size: "compact", language: "ko", retry: "never",
        theme: document.documentElement.dataset.timeTheme === "night" ? "dark" : "light",
        "refresh-expired": "manual", "response-field": false,
        callback: (token: string) => {
          if (cancelled) return;
          setStatus("보안 확인 결과를 확인하고 있어요.");
          callback.current(token);
        },
        "expired-callback": () => { if (!cancelled) setStatus("보안 확인이 만료됐어요. 아래에서 다시 확인해 주세요."); },
        "timeout-callback": () => { if (!cancelled) setStatus("보안 확인 시간이 지났어요. 아래에서 다시 확인해 주세요."); },
        "error-callback": () => { if (!cancelled) setStatus("보안 확인을 불러오지 못했어요. 다시 확인하거나 기본 안내를 이용해 주세요."); },
      });
      setStatus("아래 Cloudflare 보안 확인을 완료해 주세요.");
    }).catch(() => { if (!cancelled) setStatus("보안 확인을 불러오지 못했어요. 다시 확인하거나 기본 안내를 이용해 주세요."); });
    return () => { cancelled = true; if (widget !== undefined) api?.remove(widget); };
  }, []);

  return <div className="guide-ai-challenge">
    <p className="guide-ai-notice" role="status">{status}</p>
    <div className="guide-ai-challenge-widget" ref={container} />
  </div>;
}

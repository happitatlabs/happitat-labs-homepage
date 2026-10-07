import { useEffect, useRef, useState, type MouseEvent } from "react";
import { portfolioGuideQuestions } from "./content";
import "./portfolio-guide.css";

// Static homepage-only guide. SQL authentication and AI services are not connected.
// TODO(vNext): Review scope and data policies before adding any conversational integrations.
export function PortfolioGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const guideRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstQuestionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) firstQuestionRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isClosing) return;
    const timeout = window.setTimeout(() => setIsClosing(false), 180);
    return () => window.clearTimeout(timeout);
  }, [isClosing]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      const style = guideRef.current?.style;
      style?.setProperty("--guide-viewport-height", `${viewport.height}px`);
      style?.setProperty("--guide-viewport-offset", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
    };
  }, []);

  function openGuide() {
    setIsClosing(false);
    setSelectedId(null);
    setIsOpen(true);
  }

  function closeGuide(restoreFocus = true) {
    setIsOpen(false);
    setIsClosing(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  function followLink(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(event.currentTarget.href);
    const target = url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash
      ? document.getElementById(decodeURIComponent(url.hash.slice(1)))
      : null;

    if (!target) {
      closeGuide();
      return;
    }

    event.preventDefault();
    closeGuide(false);
    // Reuse the site's header-aware hash scrolling, including repeated hash links.
    if (window.location.hash !== url.hash) window.history.pushState(null, "", url.hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
    target.focus({ preventScroll: true });
  }

  function renderLink(action: { label: string; href: string }, context?: string) {
    const external = action.href.startsWith("https://");
    return (
      <a
        className="guide-cta"
        key={action.href}
        href={action.href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        aria-label={`${context ? `${context}: ` : ""}${action.label}${external ? " (새 탭)" : ""}`}
        onClick={followLink}
      >
        {action.label} <span aria-hidden="true">{external ? "↗" : "→"}</span>
      </a>
    );
  }

  return (
    <aside
      ref={guideRef}
      className="portfolio-guide"
      aria-label="멜의 포트폴리오 안내"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeGuide();
        }
      }}
      onBlur={(event) => {
        if (isOpen && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          closeGuide(false);
        }
      }}
    >
      {(isOpen || isClosing) && (
        <section
          className={`guide-bubble${isClosing ? " is-closing" : ""}`}
          ref={(node) => { node?.toggleAttribute("inert", !isOpen); }}
          id="portfolio-guide-dialog"
          role="dialog"
          aria-modal="false"
          aria-hidden={!isOpen}
          aria-labelledby="portfolio-guide-title"
        >
          <div className="guide-header">
            <div>
              <p>Happitat Labs</p>
              <h2 id="portfolio-guide-title">안녕하세요, 멜이에요</h2>
            </div>
            <button
              className="guide-close"
              type="button"
              onClick={() => closeGuide()}
              aria-label="멜 안내 닫기"
              title="멜 안내 닫기"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="guide-content">
            <p className="guide-prompt">어떤 이야기가 궁금하세요?</p>
            {portfolioGuideQuestions.map((item, index) => (
              <div className="guide-question" key={item.id}>
                <button
                  ref={index === 0 ? firstQuestionRef : undefined}
                  className="guide-question-button"
                  type="button"
                  id={`guide-question-${item.id}`}
                  aria-expanded={selectedId === item.id}
                  aria-controls={`guide-answer-${item.id}`}
                  onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                >
                  <span>{item.label}</span>
                  <span className="guide-question-symbol" aria-hidden="true">
                    {selectedId === item.id ? "−" : "+"}
                  </span>
                </button>
                <div
                  className="guide-answer"
                  id={`guide-answer-${item.id}`}
                  role="region"
                  aria-labelledby={`guide-question-${item.id}`}
                  hidden={selectedId !== item.id}
                >
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                  {item.items && (
                    <ul>
                      {item.items.map((entry) => (
                        <li key={entry.title}>
                          <strong>{entry.title}</strong>
                          <p>{entry.description}</p>
                          {renderLink(entry.action, entry.title)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <nav className="guide-actions" aria-label={`${item.label} 관련 공개 자료`}>
                    {item.actions.map((action) => renderLink(action))}
                  </nav>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <button
        className="guide-trigger"
        type="button"
        ref={triggerRef}
        aria-label={isOpen ? "멜 안내 접기" : "멜 안내 열기"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "portfolio-guide-dialog" : undefined}
        title={isOpen ? "멜 안내 접기" : "멜 안내 열기"}
        onClick={() => (isOpen ? closeGuide() : openGuide())}
      >
        <span className="guide-character" aria-hidden="true">
          <span className="guide-character-arm guide-character-arm-left" />
          <span className="guide-character-arm guide-character-arm-right" />
          <span className="guide-character-book">
            <span className="guide-character-tab" />
            <span className="guide-character-eyes"><i /><i /></span>
            <span className="guide-character-smile" />
            <span className="guide-character-lines" />
          </span>
        </span>
        <span className="guide-trigger-label" aria-hidden="true">안내</span>
      </button>
    </aside>
  );
}

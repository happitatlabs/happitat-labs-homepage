import { useEffect, useRef, useState } from "react";
import { portfolioGuideQuestions } from "./content";
import "./portfolio-guide.css";

// TODO(vNext): Review scope and data policies before adding any conversational integrations.
export function PortfolioGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstQuestionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) firstQuestionRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  function closeGuide() {
    setIsOpen(false);
    setSelectedId(null);
    triggerRef.current?.focus({ preventScroll: true });
  }

  return (
    <aside
      className="portfolio-guide"
      aria-label="포트폴리오 안내"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeGuide();
        }
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setSelectedId(null);
        }
      }}
    >
      {isOpen && (
        <section
          className="guide-bubble"
          id="portfolio-guide-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby="portfolio-guide-title"
        >
          <div className="guide-header">
            <div>
              <p>Happitat Labs</p>
              <h2 id="portfolio-guide-title">작업실 안내</h2>
            </div>
            <button
              className="guide-close"
              type="button"
              onClick={closeGuide}
              aria-label="안내 닫기"
              title="안내 닫기"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="guide-content">
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
                  <span>{item.question}</span>
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
                  <p>{item.answer}</p>
                  {item.items && (
                    <ul>
                      {item.items.map((entry) => (
                        <li key={entry.title}>
                          <strong>{entry.title}</strong>
                          <p>{entry.description}</p>
                        </li>
                      ))}
                    </ul>
                  )}
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
        aria-label={isOpen ? "포트폴리오 안내 닫기" : "포트폴리오 안내 열기"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "portfolio-guide-dialog" : undefined}
        title={isOpen ? "포트폴리오 안내 닫기" : "포트폴리오 안내 열기"}
        onClick={() => (isOpen ? closeGuide() : setIsOpen(true))}
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

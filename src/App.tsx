import type { CSSProperties } from "react";
import { Fragment, useEffect, useState } from "react";
import { HabitatResearchField } from "./HabitatResearchField";
import {
  capabilityTags,
  labNotes,
  links,
  type LabNote,
  type Product,
  processSteps,
  products,
} from "./content";

type TimeTheme = "dawn" | "day" | "dusk" | "night";

const themeColors: Record<TimeTheme, string> = {
  dawn: "#f7f1e8",
  day: "#fbfaf7",
  dusk: "#211d1a",
  night: "#101418",
};

function resolveTimeTheme(date = new Date()): TimeTheme {
  const hour = date.getHours();

  if (hour >= 5 && hour < 10) return "dawn";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

function useTimeTheme() {
  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = resolveTimeTheme();
      document.documentElement.dataset.timeTheme = nextTheme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", themeColors[nextTheme]);
    };

    applyTheme();
    const intervalId = window.setInterval(applyTheme, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);
}

function App() {
  useTimeTheme();
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  const selectedProduct = products.find((product) => product.path === currentPath);
  const isProductRoute = currentPath.startsWith("/products");

  useScrollReveal(currentPath);
  useHashScroll(currentPath);

  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 바로가기
      </a>

      <SiteHeader productMode={isProductRoute} />

      {selectedProduct ? (
        <ProductDetailPage product={selectedProduct} />
      ) : isProductRoute ? (
        <MissingProductPage />
      ) : (
        <HomePage />
      )}

      <footer className="site-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Happitat Labs</p>
        </div>
      </footer>
    </>
  );
}

function useScrollReveal(pathKey: string) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.documentElement.classList.add("reveal-ready");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [pathKey]);
}

function useHashScroll(pathKey: string) {
  useEffect(() => {
    let frameId = 0;
    let retryTimeoutId: number | undefined;

    const scrollToCurrentHash = (attempt = 0) => {
      const targetId = decodeURIComponent(window.location.hash.replace("#", ""));
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) {
        if (attempt < 12) {
          retryTimeoutId = window.setTimeout(
            () => scrollToCurrentHash(attempt + 1),
            50,
          );
        }
        return;
      }

      const headerHeight =
        document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - headerHeight - 8;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
    };

    const scheduleScroll = () => {
      window.clearTimeout(retryTimeoutId);
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => scrollToCurrentHash());
      });
    };

    scheduleScroll();
    window.addEventListener("hashchange", scheduleScroll);

    return () => {
      window.removeEventListener("hashchange", scheduleScroll);
      window.clearTimeout(retryTimeoutId);
      window.cancelAnimationFrame(frameId);
    };
  }, [pathKey]);
}

function SiteHeader({ productMode }: { productMode?: boolean }) {
  const sectionHref = (id: string) => (productMode ? `/#${id}` : `#${id}`);

  return (
    <header className="site-header">
      <a className="brand" href={productMode ? "/" : "#home"} aria-label="Happitat Labs 홈">
        Happitat Labs
      </a>
      <nav aria-label="주요 섹션">
        <a href={sectionHref("about")}>About</a>
        <a href={sectionHref("products")}>Products</a>
        <a href={sectionHref("process")}>Process</a>
        <a href={links.tistory} target="_blank" rel="noreferrer">
          Lab Notes
        </a>
        <a href={sectionHref("founder")}>Founder</a>
        <a href={sectionHref("contact")}>Contact</a>
      </nav>
    </header>
  );
}

function HomePage() {
  const recentLabNotes = useLabNotes();

  return (
    <main id="main">
        <section className="hero" id="home" aria-labelledby="hero-title">
          <img
            className="hero-visual"
            src="/hero-visual.png"
            alt=""
            aria-hidden="true"
          />
          <div className="hero-shade" />
          <div className="container hero-content reveal">
            <p className="eyebrow">Independent maker's notes</p>
            <h1 id="hero-title">Happitat Labs</h1>
            <p className="hero-copy">
              사람과 시스템 사이의 복잡함을 조금 덜어내는 도구를 만듭니다.
            </p>
            <p className="hero-support">
              일상과 업무에서 자주 마주치는 불편을 기록하고, 직접 써볼 수 있는
              작은 MVP로 만듭니다. 혼자 먼저 써보고, 피드백을 들으며 고칩니다.
              지금은 AI를 활용해 이해하기 어려운 흐름을 조금 더 단순하게 만드는
              일을 하고 있습니다.
            </p>
            <div className="hero-actions" aria-label="주요 링크">
              <a className="button button-primary" href="#products">
                제품 보기
              </a>
              <a
                className="button button-secondary"
                href={links.notion}
                target="_blank"
                rel="noreferrer"
              >
                대표 노션
              </a>
            </div>
          </div>
        </section>

        <section className="section about-section" id="about" aria-labelledby="about-title">
          <div className="container section-grid">
            <div className="section-heading reveal">
              <p className="eyebrow">About</p>
              <h2 id="about-title">혼자 만들고, 천천히 키웁니다</h2>
            </div>
            <div className="section-body reveal reveal-delay-1">
              <p>
                Happitat Labs는 개발자 김혜인이 운영하는 작은 개인 작업실입니다.
              </p>
              <p>
                일과 생활 중 불편한 순간을 발견하면, 필요한 만큼의 도구를 직접
                만듭니다. 혼자 써보고, 주변의 피드백을 들으며 계속 사용할 이유가
                있는지 확인합니다.
              </p>
              <ul className="capability-list" aria-label="개발 영역">
                {capabilityTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="products" aria-labelledby="products-title">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Products</p>
              <h2 id="products-title">지금 만들고 있는 것들</h2>
              <p className="section-lead">
                아직 완성된 제품 모음은 아닙니다. 직접 마주친 문제에서 시작해,
                작게 만들고 실제로 쓰면서 방향을 찾아가는 작업들입니다.
              </p>
            </div>
            <div className="product-grid">
              {products.map((product, index) => (
                <article
                  className="product-card reveal"
                  style={
                    {
                      "--reveal-delay": `${120 + index * 80}ms`,
                    } as CSSProperties
                  }
                  key={product.name}
                >
                  <a
                    className="product-card-link"
                    href={product.path}
                    aria-label={`${product.name} 자세히 보기`}
                  >
                    <div className="product-card-top">
                      <p className="product-signal">{product.signal}</p>
                      <span className="status-badge">{product.status}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.summary}</p>
                    {product.releaseLabel && (
                      <span className="release-note">{product.releaseLabel}</span>
                    )}
                    <span className="card-cta">{product.cardCta ?? "자세히 보기"}</span>
                  </a>
                  {product.demoUrl && (
                    <a
                      className="button button-secondary card-demo-button"
                      href={product.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${product.name} 데모 열기`}
                    >
                      데모 열기 <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section process-section" id="process" aria-labelledby="process-title">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Process</p>
              <h2 id="process-title">보통 이렇게 작업합니다</h2>
              <p className="section-lead">
                거창한 계획보다 지금 불편한 한 장면에서 시작합니다. 직접 쓸 수
                있는 형태로 만든 뒤, 오래 남길 만한 문제인지 천천히 확인합니다.
              </p>
            </div>
            <div className="process-grid">
              {processSteps.map((step, index) => (
                <Fragment key={step.title}>
                  <article
                    className="process-card reveal"
                    style={
                      {
                        "--reveal-delay": `${100 + index * 70}ms`,
                      } as CSSProperties
                    }
                  >
                    <span className="process-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3>{step.title}</h3>
                    <p className="process-subtitle">{step.subtitle}</p>
                    <p>{step.description}</p>
                  </article>
                  {index < processSteps.length - 1 && (
                    <div
                      className="process-arrow reveal"
                      style={
                        {
                          "--reveal-delay": `${135 + index * 70}ms`,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    >
                      <span className="arrow-horizontal">→</span>
                      <span className="arrow-vertical">↓</span>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section
          className="section habitat-research-section"
          aria-labelledby="habitat-research-title"
        >
          <div className="container habitat-research-layout">
            <div className="habitat-research-copy reveal">
              <p className="eyebrow">Habitat Research Field</p>
              <h2 id="habitat-research-title">
                만드는 동안, 자주 멈춰서 살핍니다.
              </h2>
              <p>
                무엇을 더 넣을지보다, 어디가 불편한지를 먼저 봅니다. 메모한
                장면을 작은 테스트로 바꾸고, 계속 쓸 만한 흐름인지 확인합니다.
              </p>
              <ol className="habitat-research-list">
                <li>
                  <span>01</span>
                  <strong>Observe</strong>
                  <p>사용 흐름에서 멈춤과 반복을 기록합니다.</p>
                </li>
                <li>
                  <span>02</span>
                  <strong>Map</strong>
                  <p>문제를 이해 가능한 단위와 관계로 정리합니다.</p>
                </li>
                <li>
                  <span>03</span>
                  <strong>Test</strong>
                  <p>작은 MVP로 바꾸어 실제 환경에서 확인합니다.</p>
                </li>
              </ol>
            </div>
            <div className="habitat-research-visual reveal reveal-delay-1">
              <HabitatResearchField />
            </div>
          </div>
        </section>

        <section className="section lab-notes-section" id="lab-notes" aria-labelledby="lab-notes-title">
          <div className="container">
            <div className="lab-notes-heading reveal">
              <div className="section-heading">
                <p className="eyebrow">Lab Notes</p>
                <h2 id="lab-notes-title">최근 제작 기록과 실험 노트</h2>
                <p className="section-lead">
                  만들면서 남기는 짧은 기록입니다. 잘된 결과보다 진행 중인 생각과
                  변경을 더 자주 적습니다.
                </p>
              </div>
              <a
                className="button button-secondary lab-notes-link"
                href={links.tistory}
                target="_blank"
                rel="noreferrer"
              >
                티스토리에서 전체 보기 <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="lab-notes-grid">
              {recentLabNotes.map((note, index) => (
                <a
                  className="lab-note-card reveal"
                  href={note.url}
                  key={note.url}
                  rel="noreferrer"
                  target="_blank"
                  style={{ "--reveal-delay": `${100 + index * 80}ms` } as CSSProperties}
                >
                  <span className="lab-note-index">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{note.title}</strong>
                  <span className="lab-note-meta">
                    {note.publishedAt} <span aria-hidden="true">↗</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="founder-band" id="founder" aria-labelledby="founder-title">
          <div className="container founder-layout reveal">
            <div>
              <p className="eyebrow">Founder</p>
              <h2 id="founder-title">
                작은 문제를 직접 만들어 해결해 보는 개발자입니다.
              </h2>
            </div>
            <p>
              안녕하세요, 김혜인입니다. 복잡한 시스템을 이해하기 쉬운 화면과 작은
              도구로 바꾸는 일을 합니다. UI/UX와 개발을 오가며, AI를 활용해 직접
              써보고 싶은 제품을 만들고 있습니다. 작업 중인 생각과 기록은 Notion에
              정리합니다.
            </p>
            <a
              className="button button-primary"
              href={links.notion}
              target="_blank"
              rel="noreferrer"
            >
              Notion 열기
            </a>
          </div>
        </section>

        <section className="section contact-section" id="contact" aria-labelledby="contact-title">
          <div className="container section-grid">
            <div className="section-heading reveal">
              <p className="eyebrow">Contact</p>
              <h2 id="contact-title">제품이나 작업 이야기가 있다면</h2>
            </div>
            <address className="contact-list reveal reveal-delay-1">
              <a href={`mailto:${links.email}`}>
                <span>Email</span>
                <strong>{links.email}</strong>
              </a>
              <a className="contact-link" href={links.github} target="_blank" rel="noreferrer">
                <span className="contact-label">
                  <GitHubIcon />
                  GitHub
                </span>
                <strong>{links.github.replace("https://", "")}</strong>
              </a>
            </address>
          </div>
        </section>
      </main>
  );
}

function useLabNotes() {
  const [notes, setNotes] = useState<LabNote[]>(labNotes);

  useEffect(() => {
    const controller = new AbortController();

    const loadNotes = async () => {
      try {
        const response = await fetch("/api/lab-notes", {
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType?.includes("application/json")) return;

        const payload = (await response.json()) as { notes?: unknown };
        if (!Array.isArray(payload.notes)) return;

        const nextNotes = payload.notes.filter(isLabNote).slice(0, 5);
        if (nextNotes.length > 0) setNotes(nextNotes);
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          console.warn("Unable to refresh Lab Notes", error);
        }
      }
    };

    void loadNotes();
    return () => controller.abort();
  }, []);

  return notes;
}

function isLabNote(value: unknown): value is LabNote {
  if (!value || typeof value !== "object") return false;

  const note = value as Partial<LabNote>;
  return (
    typeof note.title === "string" &&
    typeof note.url === "string" &&
    typeof note.publishedAt === "string"
  );
}

function ProductDetailPage({ product }: { product: Product }) {
  const relatedProducts = products.filter((item) => item.path !== product.path);
  const hasStoreUrl = Boolean(product.storeUrl);
  const hasDemoUrl = Boolean(product.demoUrl);
  const isPreparing = product.status === "Preparing";

  return (
    <main id="main" className="detail-main">
      <section className="section detail-hero" aria-labelledby="product-title">
        <div className="container detail-hero-inner reveal">
          <a className="back-link" href="/#products">
            Products로 돌아가기
          </a>
          <div className="detail-heading-row">
            <p className="eyebrow">{product.signal}</p>
            <span className="status-badge">{product.status}</span>
          </div>
          <h1 id="product-title">{product.name}</h1>
          <p>{product.detail}</p>
          <div className="detail-actions">
            {product.storeUrl && (
              <a
                className="button button-primary"
                href={product.storeUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${product.name} Google Play에서 보기`}
              >
                Google Play에서 앱 보기
              </a>
            )}
            {product.demoUrl && (
              <a
                className={hasStoreUrl ? "button button-secondary" : "button button-primary"}
                href={product.demoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${product.name} 데모 열기`}
              >
                데모 열기
              </a>
            )}
            <a
              className={hasStoreUrl || hasDemoUrl ? "button button-secondary" : "button button-primary"}
              href={product.updateUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${product.name} 업데이트 보기`}
            >
              {product.updateLabel}
            </a>
            <a className="button button-secondary" href="/#contact">
              문의하기
            </a>
          </div>
        </div>
      </section>

      <section className="section detail-section" aria-labelledby="detail-status-title">
        <div className="container section-grid">
          <div className="section-heading reveal">
            <p className="eyebrow">Product page</p>
            <h2 id="detail-status-title">
              {hasStoreUrl
                ? "Google Play에서 공개 중입니다"
                : isPreparing
                  ? "제품 자리를 준비 중입니다"
                  : "MVP 검증 기록을 준비 중입니다"}
            </h2>
          </div>
          <div className="section-body reveal reveal-delay-1">
            <p>
              {hasStoreUrl
                ? `${product.name}은 Android에서 바로 확인할 수 있습니다. 제품 업데이트와 실험 기록은 GitHub 및 대표 Notion에 순차적으로 정리합니다.`
                : isPreparing
                  ? `${product.name}은 현재 콘셉트와 MVP 범위를 정리하고 있습니다. 공개 가능한 내용은 이 상세 경로에 순차적으로 연결합니다.`
                : "이 경로는 제품별 실험 기록, 사용자 피드백, 데모, 업데이트 로그를 연결하기 위해 열어두었습니다. 검증 가능한 내용부터 순차적으로 공개할 예정입니다."}
            </p>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="section related-section" aria-labelledby="related-title">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">More products</p>
              <h2 id="related-title">다른 제품 살펴보기</h2>
            </div>
            <div className="related-grid">
              {relatedProducts.map((item) => (
                <a className="related-card reveal" href={item.path} key={item.name}>
                  <span className="status-badge">{item.status}</span>
                  <strong>{item.name}</strong>
                  <span>자세히 보기</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function MissingProductPage() {
  return (
    <main id="main" className="detail-main">
      <section className="section detail-hero" aria-labelledby="missing-product-title">
        <div className="container detail-hero-inner reveal">
          <a className="back-link" href="/#products">
            Products로 돌아가기
          </a>
          <p className="eyebrow">Products</p>
          <h1 id="missing-product-title">준비 중인 제품 페이지입니다</h1>
          <p>
            아직 공개되지 않은 제품 경로입니다. 현재 소개 가능한 제품은 아래 목록에서
            확인할 수 있습니다.
          </p>
        </div>
      </section>
      <section className="section related-section" aria-labelledby="known-products-title">
        <div className="container">
          <div className="section-heading reveal">
            <p className="eyebrow">Available</p>
            <h2 id="known-products-title">현재 제품</h2>
          </div>
          <div className="related-grid">
            {products.map((item) => (
              <a className="related-card reveal" href={item.path} key={item.name}>
                <span className="status-badge">{item.status}</span>
                <strong>{item.name}</strong>
                <span>자세히 보기</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="github-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 7c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.15 10.15 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

export default App;

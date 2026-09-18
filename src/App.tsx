import type { CSSProperties } from "react";
import { Fragment, useEffect, useState } from "react";
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
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const elements = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    document.documentElement.classList.add("reveal-ready");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      const showElements = () =>
        elements().forEach((element) => element.classList.add("is-visible"));

      showElements();
      const mutationObserver = new MutationObserver(showElements);
      mutationObserver.observe(document.body, { childList: true, subtree: true });

      return () => mutationObserver.disconnect();
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

    const observe = (element: HTMLElement) => {
      if (!element.classList.contains("is-visible")) observer.observe(element);
    };

    elements().forEach(observe);

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(".reveal")) observe(node);
          node.querySelectorAll<HTMLElement>(".reveal").forEach(observe);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
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
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
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
  const featuredProducts = ["/products/sql-diagnoser", "/products/happy-habitat", "/products/dot-code-editor"]
    .map((path) => products.find((product) => product.path === path)!);

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
              사람과 시스템 사이의 복잡함을 줄이는 소프트웨어를 만듭니다.
            </p>
            <p className="hero-support">
              문제 정의부터 MVP 구현·검증까지 직접 수행합니다.
              UI/UX로 사용자의 문제를 이해하고, AI와 소프트웨어로
              실제 사용할 수 있는 제품을 만듭니다.
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
                UI/UX에서 시작해 정보시스템, 데이터, 업무 자동화로 작업 범위를
                넓혀 왔습니다. 사용자와 현업의 문제를 구조화하고, 작은 MVP를
                구현한 뒤 테스트와 사용 피드백으로 개선합니다.
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
              {featuredProducts.map((product, index) => (
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
                기록에서 구조로, 구조에서 제품으로
              </h2>
              <p className="founder-identity"><strong>김혜인</strong><span>AI Product Builder / Product Engineer</span></p>
            </div>
            <p>
              UI/UX에서 시작해 정보시스템, 데이터, 업무 자동화로 영역을 확장했습니다.
              사용자와 현업의 문제를 구조화하고, AI와 소프트웨어를 이용해
              실제 사용할 수 있는 제품으로 구현합니다. 작업과 검증 기록은 Notion에 남깁니다.
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
    let loading = false;

    const loadNotes = async () => {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const response = await fetch("/api/lab-notes", {
          signal: controller.signal,
          cache: "no-store",
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
      } finally {
        loading = false;
      }
    };

    void loadNotes();
    const interval = window.setInterval(() => void loadNotes(), 60_000);
    const refresh = () => void loadNotes();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
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

      {product.path === "/products/sql-diagnoser" && <SqlCaseStudy />}

      <section className="section detail-section" aria-labelledby="detail-status-title">
        <div className="container section-grid">
          <div className="section-heading reveal">
            <p className="eyebrow">Product page</p>
            <h2 id="detail-status-title">
              {hasStoreUrl
                ? "Google Play에서 공개 중입니다"
                : isPreparing
                  ? "제품 자리를 준비 중입니다"
                  : hasDemoUrl ? "브라우저에서 직접 확인할 수 있습니다" : "제품의 현재 단계"}
            </h2>
          </div>
          <div className="section-body reveal reveal-delay-1">
            {product.path === "/products/happy-habitat" && <p>바쁜 하루에 지나쳐 버리는 행복과 회복의 순간을 남기고, 기록을 돌아보며 다음 하루를 이어 가도록 돕습니다.</p>}
            {product.path === "/products/dot-code-editor" && <p>작은 픽셀 이미지를 편집하고 코드로 옮길 때 생기는 반복 작업을 줄이는 도구를 목표로 합니다.</p>}
            <p>
              {hasStoreUrl
                ? `${product.name}은 Android에서 바로 확인할 수 있습니다. 제품 업데이트와 실험 기록은 GitHub 및 대표 Notion에 순차적으로 정리합니다.`
                : isPreparing
                  ? `${product.name}은 현재 콘셉트와 MVP 범위를 정리하고 있습니다. 공개 가능한 내용은 이 상세 경로에 순차적으로 연결합니다.`
                : hasDemoUrl ? "공개 데모에서 현재 동작을 확인할 수 있습니다. 공개 가능한 기능과 검증 결과를 정리하고 있습니다."
                : "현재 공개 가능한 기능과 검증 결과를 정리하고 있습니다."}
            </p>
            <a href={links.notion} target="_blank" rel="noreferrer">대표 Notion에서 업데이트 보기</a>
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

function SqlCaseStudy() {
  const sections = [
    { label: "Problem", title: "SQL을 실행하기 전에 구조를 이해할 수 있을까?", text: "테이블, JOIN, 조건, 집계, 의존성이 한 문장에 섞여 있으면 새로운 담당자가 맥락을 파악하기 어렵습니다. SQL을 실행하지 않아도 구조와 확인할 지점을 빠르게 읽을 수 있는 도구를 목표로 했습니다." },
    { label: "My Role", title: "문제 정의부터 구현과 검증까지", text: "문제 정의와 사용자 흐름 설계, UI/UX, 규칙 기반 분석 구조 설계, React 프론트엔드 구현, 테스트 및 개선을 직접 수행했습니다." },
    { label: "What I Built", title: "구조를 추출하고, 검토할 근거를 남깁니다", items: ["테이블·alias·JOIN 관계와 WHERE / HAVING / 집계 분석", "CTE·CASE·윈도우 함수와 서브쿼리 구조 파악", "다건 SQL의 테이블 자산 지도·의존성 흐름·리스크 후보 정리", "변경 전후 SQL 구조 비교와 검토 체크리스트", "분석 보고서 생성 및 공개 웹 데모"] },
    { label: "AI / LLM", title: "분석 근거와 AI 설명을 분리합니다", text: "기본 분석은 AI 없이 규칙 기반으로 동작합니다. AI 설명 보강과 문서 초안 생성은 별도 설정 환경에서 선택적으로 사용합니다. 소스에는 OpenAI·Azure OpenAI·Ollama 연동이 구현되어 있으며, 공개 데모의 활성 상태와는 구분합니다. SQL은 전송 전에 마스킹하고, AI 호출에 실패해도 기본 분석 결과는 유지합니다." },
    { label: "Validation", title: "입력 사례와 예외를 테스트합니다", text: "JOIN·집계·CTE·CASE·윈도우 함수 예제, SQL 변경 비교, 민감값 마스킹, AI 응답 오류와 실패 시 기본 결과 유지 동작을 자동 테스트로 확인합니다. 정규식 기반 정적 분석의 한계를 명시하며, 실행 계획이나 실제 성능·데이터 영향을 확정하지 않습니다." },
    { label: "Stack", title: "구현에 사용한 기술", text: "React · TypeScript · Vite · Cloudflare Workers. SQL 텍스트의 규칙 기반 분석과 선택형 서버 AI API로 구성했습니다." },
    { label: "Safe Demo", title: "운영 데이터를 사용하지 않는 데모", text: "기본 분석은 입력된 SQL 구조를 브라우저에서 해석하며 SQL을 실행하거나 브라우저 저장소에 저장하지 않습니다. 실제 운영 SQL·개인정보·고객 식별값은 입력하지 마세요. AI 기능은 별도 환경에서 선택적으로 활성화하며, 마스킹 후에도 테이블명·컬럼명·업무 구조가 요청에 포함될 수 있습니다." },
  ];
  return <section className="section case-study" aria-label="SQL Diagnoser Case Study">
    <div className="container">
      {sections.map((section) => <div className="section-grid case-study-row reveal" key={section.label}>
        <div className="section-heading"><p className="eyebrow">{section.label}</p><h2>{section.title}</h2></div>
        <div className="section-body">{section.text && <p>{section.text}</p>}{section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}</div>
      </div>)}
    </div>
  </section>;
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

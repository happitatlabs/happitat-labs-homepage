import type { CSSProperties } from "react";
import { Fragment, lazy, Suspense, useEffect } from "react";
import {
  capabilityTags,
  links,
  type Product,
  products,
} from "./content";

const PrototypeCanvas = lazy(async () => {
  const module = await import("./LabExperience");
  return { default: module.PrototypeCanvas };
});

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
  const isInnerPage = productMode;
  const sectionHref = (id: string) => (isInnerPage ? `/#${id}` : `#${id}`);

  return (
    <header className="site-header">
      <a className="brand" href={isInnerPage ? "/" : "#home"} aria-label="Happitat Labs 홈">
        Happitat Labs
      </a>
      <nav aria-label="주요 섹션">
        <a href={sectionHref("process")}>작업</a>
        <a href={sectionHref("about")}>소개</a>
        <a href={links.notion} target="_blank" rel="noreferrer">기록</a>
        <a href={sectionHref("contact")}>연락</a>
      </nav>
    </header>
  );
}

function HomePage() {
  return (
    <main id="main" className="studio-home">
      <section className="studio-hero" id="home" aria-labelledby="hero-title">
        <div className="container studio-hero-grid">
          <div className="studio-hero-copy reveal">
            <p className="studio-kicker">독립 AI Product Studio</p>
            <h1 id="hero-title">
              작은 문제를 발견하고,
              <br />
              구조화하고,
              <br />
              검증 가능한 MVP로
              <br />
              만듭니다.
            </h1>
            <p>
              조용하고 단정한 방식으로 제품을 설계하는 독립 AI Product Studio.
              문제를 관찰하고 구조로 정리한 뒤, 실제로 쓸 수 있는 작은 제품으로
              검증합니다.
            </p>
          </div>

          <div className="studio-object-stage" aria-hidden="true">
            <Suspense fallback={<div className="studio-object-fallback" />}>
              <PrototypeCanvas />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="studio-process section" id="process" aria-labelledby="process-title">
        <div className="container">
          <div className="studio-section-heading reveal">
            <p className="studio-kicker">Working note</p>
            <h2 id="process-title">작은 제품이 만들어지는 순서</h2>
          </div>
          <ol className="editorial-process-list">
            {editorialProcessSteps.map((step, index) => (
              <li className={index % 2 === 1 ? "is-offset reveal" : "reveal"} key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i aria-hidden="true" />
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="selected-products section" id="products" aria-labelledby="products-title">
        <div className="container">
          <div className="studio-section-heading studio-products-heading reveal">
            <div>
              <p className="studio-kicker">Selected products</p>
              <h2 id="products-title">선별된 제품</h2>
            </div>
            <a className="quiet-link" href={links.notion} target="_blank" rel="noreferrer">
              작업 기록 보기 <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="selected-product-grid">
            {products.slice(0, 3).map((product, index) => (
              <article
                className="selected-product-card reveal"
                style={{ "--reveal-delay": `${80 + index * 90}ms` } as CSSProperties}
                key={product.name}
              >
                <div className={`product-mark product-mark-${index + 1}`} aria-hidden="true">
                  <span />
                </div>
                <div>
                  <p>{product.signal}</p>
                  <h3>{product.name}</h3>
                  <p>{product.summary}</p>
                </div>
                <div className="selected-product-meta">
                  <span>{product.status}</span>
                  <a href={product.path}>자세히 보기 <span aria-hidden="true">→</span></a>
                </div>
              </article>
            ))}
          </div>
          {products.length > 3 && (
            <p className="other-product-links reveal">
              더 많은 실험 제품: {products.slice(3).map((product, index) => (
                <Fragment key={product.name}>
                  {index > 0 && <span aria-hidden="true"> · </span>}
                  <a href={product.path}>{product.name}</a>
                </Fragment>
              ))}
            </p>
          )}
        </div>
      </section>

        <section className="section about-section" id="about" aria-labelledby="about-title">
          <div className="container section-grid">
            <div className="section-heading reveal studio-existing-heading">
              <p className="studio-kicker">About</p>
              <h2 id="about-title">MVP First 제품 스튜디오</h2>
            </div>
            <div className="section-body reveal reveal-delay-1">
              <p>
                Happitat Labs는 작은 문제를 꾸준히 해결하는 독립 제품
                스튜디오입니다.
              </p>
              <p>
                우리는 화려한 플랫폼보다 실제로 사용되는 작은 도구를 먼저
                만듭니다. 문제가 검증되면 제품이 되고, 제품이 모이면 플랫폼이
                됩니다.
              </p>
              <ul className="capability-list" aria-label="개발 영역">
                {capabilityTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="founder-band" id="founder" aria-labelledby="founder-title">
          <div className="container founder-layout reveal">
            <div>
              <p className="eyebrow">Founder</p>
              <h2 id="founder-title">
                문제를 구조로 해결하는 AI 응용소프트웨어 개발자
              </h2>
            </div>
            <p>
              복잡한 시스템을 단순하게 만드는 것을 좋아합니다. UI/UX에서 시작하여
              AI Product Engineering으로 영역을 확장하고 있습니다. 현재는 AI를
              활용해 사람과 시스템 사이의 이해 비용을 줄이는 제품을 연구하고
              있습니다.
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
              <h2 id="contact-title">제품 및 프로젝트에 관한 문의</h2>
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

const editorialProcessSteps = [
  {
    title: "문제 발견",
    description: "사용자와 시장의 작은 신호를 수집하고, 가장 의미 있는 문제를 정의합니다.",
  },
  {
    title: "구조화",
    description: "문제를 분해하고 핵심 가설과 구조로 정리해 해결의 방향을 세웁니다.",
  },
  {
    title: "MVP",
    description: "가장 작은 형태로 빠르게 만들어 핵심 가설을 테스트합니다.",
  },
  {
    title: "검증",
    description: "데이터와 사용자 피드백으로 학습하여 다음 결정을 내립니다.",
  },
];

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

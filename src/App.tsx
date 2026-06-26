import type { CSSProperties } from "react";
import { Fragment, useEffect } from "react";
import {
  capabilityTags,
  links,
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
        <a href={sectionHref("founder")}>Founder</a>
        <a href={sectionHref("contact")}>Contact</a>
      </nav>
    </header>
  );
}

function HomePage() {
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
            <p className="eyebrow">MVP First AI Product Studio</p>
            <h1 id="hero-title">Happitat Labs</h1>
            <p className="hero-copy">
              사람과 시스템 사이의 복잡함을 줄이는 소프트웨어를 만듭니다.
            </p>
            <p className="hero-support">
              우리는 일상과 업무 속 작은 불편을 발견합니다. 빠르게 MVP를 만들고
              실제 사용자의 피드백으로 검증합니다. 검증된 제품은 하나의 공통
              엔진으로 발전시키며, 결국 사람과 시스템 사이의 복잡함을 줄이는 AI
              Product Studio를 지향합니다.
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

        <section className="section" id="products" aria-labelledby="products-title">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Products</p>
              <h2 id="products-title">MVP에서 플랫폼으로 성장하는 제품들</h2>
              <p className="section-lead">
                제품을 나열하기보다 작은 문제를 빠르게 만들고 검증하며, 반복되는
                구조를 공통 엔진으로 키워가는 흐름에 집중합니다.
              </p>
            </div>
            <div className="product-grid">
              {products.map((product, index) => (
                <a
                  className="product-card product-card-link reveal"
                  href={product.path}
                  style={
                    {
                      "--reveal-delay": `${120 + index * 80}ms`,
                    } as CSSProperties
                  }
                  key={product.name}
                  aria-label={`${product.name} 자세히 보기`}
                >
                  <div className="product-card-top">
                    <p className="product-signal">{product.signal}</p>
                    <span className="status-badge">{product.status}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.summary}</p>
                  <span className="card-cta">자세히 보기</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section process-section" id="process" aria-labelledby="process-title">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Process</p>
              <h2 id="process-title">Happitat 방식</h2>
              <p className="section-lead">
                Happitat Labs는 플랫폼을 먼저 만들지 않습니다. 작은 문제 하나를
                발견하고, MVP로 검증한 뒤, 반복되는 구조를 제품과 플랫폼으로
                성장시킵니다.
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
              <h2 id="contact-title">제품, 협업, 실험에 관한 연락</h2>
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

function ProductDetailPage({ product }: { product: Product }) {
  const relatedProducts = products.filter((item) => item.path !== product.path);

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
            <a
              className="button button-primary"
              href={links.notion}
              target="_blank"
              rel="noreferrer"
            >
              대표 Notion에서 업데이트 보기
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
            <h2 id="detail-status-title">MVP 검증 기록을 준비 중입니다</h2>
          </div>
          <div className="section-body reveal reveal-delay-1">
            <p>
              이 경로는 제품별 실험 기록, 사용자 피드백, 데모, 업데이트 로그를
              연결하기 위해 열어두었습니다. 검증 가능한 내용부터 순차적으로
              공개할 예정입니다.
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

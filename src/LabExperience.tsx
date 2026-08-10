import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { useEffect, useRef, useState } from "react";
import { products } from "./content";

type StageKind = "discover" | "structure" | "build" | "validate" | "habitat";

type LabStage = {
  id: StageKind;
  index: number;
  title: string;
  koreanTitle: string;
  description: string;
  color: string;
  position: [number, number, number];
};

const labStages: LabStage[] = [
  {
    id: "discover",
    index: 1,
    title: "Discover",
    koreanTitle: "문제 발견",
    description: "반복되는 작은 불편과 사용자가 멈추는 지점을 먼저 관찰합니다.",
    color: "#ce7143",
    position: [-6.2, 0.1, 0.48],
  },
  {
    id: "structure",
    index: 2,
    title: "Structure",
    koreanTitle: "정보 구조화",
    description: "흩어진 맥락을 사람이 이해하고 이어 갈 수 있는 흐름으로 정리합니다.",
    color: "#167b80",
    position: [-3.1, 0.1, -0.1],
  },
  {
    id: "build",
    index: 3,
    title: "Build",
    koreanTitle: "MVP 제작",
    description: "AI와 소프트웨어를 활용해 작고 검증 가능한 제품을 만듭니다.",
    color: "#b8893f",
    position: [0, 0.1, -0.44],
  },
  {
    id: "validate",
    index: 4,
    title: "Validate",
    koreanTitle: "실사용 검증",
    description: "실제 사용 흐름에서 남는 불편과 다음 개선 지점을 확인합니다.",
    color: "#8d6867",
    position: [3.1, 0.1, -0.1],
  },
  {
    id: "habitat",
    index: 5,
    title: "Habitat",
    koreanTitle: "제품 생태계",
    description: "검증된 제품과 공통 구조를 연결해 오래 쓰이는 생태계로 키웁니다.",
    color: "#527962",
    position: [6.2, 0.1, 0.48],
  },
];

const productColors = ["#ce7143", "#167b80", "#b8893f", "#8d6867", "#527962"];

export function LabExperience() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const supportsWebGL = useWebGLSupport();
  const activeStage = labStages[activeStageIndex];
  const activeProduct = products[activeProductIndex];

  return (
    <main id="main" className="lab-main">
      <section className="lab-hero" id="lab-overview" aria-labelledby="lab-title">
        <div className="lab-canvas" aria-hidden="true">
          {supportsWebGL ? (
            <Canvas
              camera={{ fov: 42, near: 0.1, far: 100, position: [0, 1.15, 16] }}
              dpr={[1, 1.5]}
              frameloop={reducedMotion ? "demand" : "always"}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            >
              <LabScene
                activeStageIndex={activeStageIndex}
                activeProductIndex={activeProductIndex}
                reducedMotion={reducedMotion}
                onStageSelect={setActiveStageIndex}
                onProductSelect={setActiveProductIndex}
              />
            </Canvas>
          ) : (
            <div className="lab-canvas-fallback" />
          )}
        </div>

        <div className="lab-hero-overlay">
          <div className="container lab-hero-layout">
            <div className="lab-intro">
              <p className="eyebrow">Interactive Product Studio</p>
              <h1 id="lab-title">From Problem<br />to Product</h1>
              <p>
                작은 문제를 발견하고, 구조화하고, MVP로 검증해 제품 생태계로
                키워갑니다.
              </p>
              <div className="lab-intro-actions">
                <a className="button button-primary" href="#lab-flow">
                  작업 흐름 보기
                </a>
                <a className="button button-secondary" href="/#products">
                  제품 목록
                </a>
              </div>
            </div>

            <section
              className="lab-stage-inspector"
              id="lab-stage-panel"
              aria-live="polite"
              aria-label="선택한 작업 단계"
            >
              <span>{String(activeStage.index).padStart(2, "0")} / 05</span>
              <h2>{activeStage.title}</h2>
              <strong>{activeStage.koreanTitle}</strong>
              <p>{activeStage.description}</p>
            </section>

            <section className="lab-product-focus" aria-label="선택한 제품">
              <p>Product in focus</p>
              <strong>{activeProduct.name}</strong>
              <span>{activeProduct.status}</span>
              <a href={activeProduct.path}>
                제품 페이지 열기 <span aria-hidden="true">→</span>
              </a>
            </section>
          </div>

          <div className="container lab-stage-rail" role="tablist" aria-label="Happitat 방식 단계">
            {labStages.map((stage, index) => (
              <button
                className={index === activeStageIndex ? "is-active" : undefined}
                type="button"
                role="tab"
                aria-selected={index === activeStageIndex}
                aria-controls="lab-stage-panel"
                key={stage.id}
                onClick={() => setActiveStageIndex(index)}
              >
                <span>{String(stage.index).padStart(2, "0")}</span>
                <strong>{stage.title}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="lab-statement section" aria-labelledby="lab-statement-title">
        <div className="container lab-statement-layout">
          <div>
            <p className="eyebrow">Studio thesis</p>
            <h2 id="lab-statement-title">작은 문제 하나가 제품이 되기까지</h2>
          </div>
          <p>
            Happitat Labs는 큰 플랫폼을 가정하고 시작하지 않습니다. 현장에서 발견한
            작은 문제를 이해 가능한 구조로 정리하고, 작동하는 MVP를 만들어 실제
            사용 흐름에서 확인합니다. 제품이 쌓이면 그 안의 반복되는 구조를 공통
            엔진으로 발전시킵니다.
          </p>
        </div>
      </section>

      <section className="lab-flow section" id="lab-flow" aria-labelledby="lab-flow-title">
        <div className="container">
          <div className="section-heading reveal">
            <p className="eyebrow">The flow</p>
            <h2 id="lab-flow-title">문제를 제품으로 바꾸는 다섯 단계</h2>
          </div>
          <ol className="lab-flow-list">
            {labStages.map((stage) => (
              <li key={stage.id}>
                <span>{String(stage.index).padStart(2, "0")}</span>
                <div>
                  <h3>{stage.title}</h3>
                  <strong>{stage.koreanTitle}</strong>
                </div>
                <p>{stage.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lab-products section" id="lab-products" aria-labelledby="lab-products-title">
        <div className="container">
          <div className="section-heading reveal">
            <p className="eyebrow">Products in the habitat</p>
            <h2 id="lab-products-title">검증 중인 제품들</h2>
            <p className="section-lead">
              오브젝트를 선택해 제품을 살펴보거나, 아래 목록에서 각 제품의 현재
              단계와 상세 페이지를 확인할 수 있습니다.
            </p>
          </div>
          <div className="lab-product-grid">
            {products.map((product, index) => (
              <article className="lab-product-card reveal" key={product.name}>
                <div className="lab-product-card-top">
                  <span style={{ backgroundColor: productColors[index] }} aria-hidden="true" />
                  <p>{product.signal}</p>
                </div>
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.summary}</p>
                </div>
                <div className="lab-product-card-footer">
                  <span className="status-badge">{product.status}</span>
                  <a href={product.path}>자세히 보기 <span aria-hidden="true">→</span></a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lab-contact-band" aria-labelledby="lab-contact-title">
        <div className="container">
          <p className="eyebrow">Build with us</p>
          <h2 id="lab-contact-title">제품, 프로젝트, 실험에 관한 이야기</h2>
          <a className="button button-primary" href="/#contact">문의하기</a>
        </div>
      </section>
    </main>
  );
}

type LabSceneProps = {
  activeStageIndex: number;
  activeProductIndex: number;
  reducedMotion: boolean;
  onStageSelect: (index: number) => void;
  onProductSelect: (index: number) => void;
};

function LabScene({
  activeStageIndex,
  activeProductIndex,
  reducedMotion,
  onStageSelect,
  onProductSelect,
}: LabSceneProps) {
  const { viewport } = useThree();
  const scale = Math.min(1, viewport.width / 15.2);

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 6, 6]} intensity={2.2} color="#fff1df" />
      <directionalLight position={[-7, 2, 2]} intensity={1.1} color="#9ad2cf" />
      <CameraParallax reducedMotion={reducedMotion} />
      <group scale={scale}>
        <SceneGround />
        <StageConnectors activeStageIndex={activeStageIndex} />
        {labStages.map((stage, index) => (
          <StageArtifact
            active={index === activeStageIndex}
            key={stage.id}
            reducedMotion={reducedMotion}
            stage={stage}
            onSelect={() => onStageSelect(index)}
          />
        ))}
        <ProductShelf
          activeProductIndex={activeProductIndex}
          reducedMotion={reducedMotion}
          onSelect={onProductSelect}
        />
      </group>
    </>
  );
}

function CameraParallax({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (reducedMotion) {
      camera.position.x = 0;
      camera.position.y = 1.15;
      camera.lookAt(0, -0.2, 0);
      return;
    }

    camera.position.x = MathUtils.damp(camera.position.x, state.pointer.x * 0.55, 2.2, delta);
    camera.position.y = MathUtils.damp(camera.position.y, 1.15 + state.pointer.y * 0.24, 2.2, delta);
    camera.lookAt(0, -0.2, 0);
  });

  return null;
}

function SceneGround() {
  return (
    <group>
      <mesh position={[0, -2.75, -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 10]} />
        <meshStandardMaterial color="#e9dfd1" roughness={0.98} metalness={0} />
      </mesh>
      <gridHelper args={[21, 21, "#c2ad97", "#d8c8b7"]} position={[0, -2.72, -0.88]} />
      <mesh position={[0, -2.64, 0.65]}>
        <boxGeometry args={[14.8, 0.12, 0.72]} />
        <meshStandardMaterial color="#c4ad95" roughness={0.86} />
      </mesh>
    </group>
  );
}

function StageConnectors({ activeStageIndex }: { activeStageIndex: number }) {
  return (
    <group>
      {labStages.slice(0, -1).map((stage, index) => {
        const nextStage = labStages[index + 1];
        const centerX = (stage.position[0] + nextStage.position[0]) / 2;
        const centerZ = (stage.position[2] + nextStage.position[2]) / 2;
        const active = index < activeStageIndex;

        return (
          <group key={stage.id} position={[centerX, -0.98, centerZ]}>
            <mesh>
              <boxGeometry args={[0.74, 0.045, 0.045]} />
              <meshStandardMaterial color={active ? "#167b80" : "#aa9a89"} emissive={active ? "#167b80" : "#000000"} emissiveIntensity={active ? 0.22 : 0} />
            </mesh>
            <mesh position={[0.48, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.12, 0.28, 4]} />
              <meshStandardMaterial color={active ? "#167b80" : "#aa9a89"} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StageArtifact({
  active,
  stage,
  reducedMotion,
  onSelect,
}: {
  active: boolean;
  stage: LabStage;
  reducedMotion: boolean;
  onSelect: () => void;
}) {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    const idleOffset = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9 + stage.index) * 0.045;
    const targetY = stage.position[1] + idleOffset + (active ? 0.2 : 0);
    group.current.position.y = MathUtils.damp(group.current.position.y, targetY, 4.5, delta);
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      active && !reducedMotion ? Math.sin(state.clock.elapsedTime * 0.35 + stage.index) * 0.055 : 0,
      4.5,
      delta,
    );
  });

  return (
    <group
      ref={group}
      position={stage.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
    >
      <mesh>
        <boxGeometry args={[2.08, 1.28, 0.24]} />
        <meshStandardMaterial
          color={active ? "#fff8ef" : "#f3e8da"}
          emissive={active ? stage.color : "#000000"}
          emissiveIntensity={active ? 0.16 : 0}
          roughness={0.82}
        />
      </mesh>
      <mesh position={[0, 0, 0.136]}>
        <planeGeometry args={[1.76, 0.9]} />
        <meshStandardMaterial color={stage.color} roughness={0.74} />
      </mesh>
      <StageSymbol kind={stage.id} />
      <mesh position={[0, -0.49, 0.18]}>
        <boxGeometry args={[1.42, 0.055, 0.03]} />
        <meshStandardMaterial color={active ? "#fff8ef" : "#e6d8c7"} />
      </mesh>
      {active && <pointLight position={[0, 0.25, 1.2]} color={stage.color} intensity={1.5} distance={3.5} />}
    </group>
  );
}

function StageSymbol({ kind }: { kind: StageKind }) {
  const symbolColor = "#fff8ef";

  if (kind === "discover") {
    return (
      <group position={[0, 0.08, 0.23]}>
        {[
          [-0.38, 0.15, 0.03],
          [0.03, 0.08, 0.04],
          [0.39, -0.16, 0.02],
        ].map(([x, y, rotation], index) => (
          <mesh key={index} position={[x, y, 0]} rotation={[0, 0, rotation]}>
            <boxGeometry args={[0.46, 0.32, 0.04]} />
            <meshStandardMaterial color={symbolColor} roughness={0.75} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "structure") {
    return (
      <group position={[0, 0.05, 0.23]}>
        {[-0.3, 0, 0.3].map((x, index) => (
          <mesh key={x} position={[x, index === 1 ? 0.03 : -0.06, 0]}>
            <boxGeometry args={[0.12, 0.56 - index * 0.08, 0.04]} />
            <meshStandardMaterial color={symbolColor} roughness={0.75} />
          </mesh>
        ))}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.9, 0.04, 0.04]} />
          <meshStandardMaterial color={symbolColor} roughness={0.75} />
        </mesh>
      </group>
    );
  }

  if (kind === "build") {
    return (
      <group position={[0, -0.04, 0.23]}>
        <mesh position={[-0.22, 0.1, 0]}>
          <boxGeometry args={[0.34, 0.34, 0.12]} />
          <meshStandardMaterial color={symbolColor} roughness={0.72} />
        </mesh>
        <mesh position={[0.2, -0.04, 0]}>
          <boxGeometry args={[0.34, 0.34, 0.12]} />
          <meshStandardMaterial color={symbolColor} roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[0.34, 0.34, 0.12]} />
          <meshStandardMaterial color={symbolColor} roughness={0.72} />
        </mesh>
      </group>
    );
  }

  if (kind === "validate") {
    return (
      <group position={[0, 0.05, 0.23]}>
        {[-0.31, 0, 0.31].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.14, 0.045, 8, 20]} />
            <meshStandardMaterial color={symbolColor} roughness={0.58} />
          </mesh>
        ))}
        <mesh position={[0, -0.31, 0]}>
          <boxGeometry args={[0.88, 0.04, 0.04]} />
          <meshStandardMaterial color={symbolColor} roughness={0.72} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0.04, 0.23]}>
      {[
        [-0.24, 0.18],
        [0.24, 0.18],
        [-0.24, -0.22],
        [0.24, -0.22],
      ].map(([x, y], index) => (
        <mesh key={index} position={[x, y, 0]}>
          <boxGeometry args={[0.26, 0.26, 0.04]} />
          <meshStandardMaterial color={symbolColor} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.05, 0.76, 0.03]} />
        <meshStandardMaterial color={symbolColor} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.05, 0.76, 0.03]} />
        <meshStandardMaterial color={symbolColor} roughness={0.72} />
      </mesh>
    </group>
  );
}

function ProductShelf({
  activeProductIndex,
  reducedMotion,
  onSelect,
}: {
  activeProductIndex: number;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <group position={[0, -2.15, 0.43]}>
      {products.map((product, index) => (
        <ProductArtifact
          active={index === activeProductIndex}
          color={productColors[index]}
          index={index}
          key={product.name}
          reducedMotion={reducedMotion}
          onSelect={() => onSelect(index)}
        />
      ))}
    </group>
  );
}

function ProductArtifact({
  active,
  color,
  index,
  reducedMotion,
  onSelect,
}: {
  active: boolean;
  color: string;
  index: number;
  reducedMotion: boolean;
  onSelect: () => void;
}) {
  const group = useRef<Group>(null);
  const x = (index - (products.length - 1) / 2) * 2.45;

  useFrame((state, delta) => {
    if (!group.current) return;
    const idleOffset = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.025;
    group.current.position.y = MathUtils.damp(group.current.position.y, idleOffset + (active ? 0.16 : 0), 5, delta);
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, active ? 0 : -0.08, 5, delta);
  });

  return (
    <group
      ref={group}
      position={[x, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
    >
      <mesh>
        <boxGeometry args={[1.42, 0.66, 0.2]} />
        <meshStandardMaterial
          color={active ? "#fff8ef" : "#eadfcf"}
          emissive={active ? color : "#000000"}
          emissiveIntensity={active ? 0.16 : 0}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[1.1, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.18, 0.15]}>
        <boxGeometry args={[0.72, 0.04, 0.02]} />
        <meshStandardMaterial color="#fff8ef" roughness={0.7} />
      </mesh>
      <mesh position={[-0.18, -0.12, 0.15]}>
        <boxGeometry args={[0.36, 0.04, 0.02]} />
        <meshStandardMaterial color="#fff8ef" roughness={0.7} />
      </mesh>
    </group>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function useWebGLSupport() {
  const [supportsWebGL, setSupportsWebGL] = useState(true);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    setSupportsWebGL(Boolean(canvas.getContext("webgl2")));
  }, []);

  return supportsWebGL;
}

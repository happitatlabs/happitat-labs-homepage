import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { type RefObject, useEffect, useRef, useState } from "react";

export function PrototypeCanvas() {
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const compactScene = useMediaQuery("(max-width: 720px)");
  const supportsWebGL = useWebGLSupport();
  const isVisible = useCanvasVisibility(root);
  const isStatic = reducedMotion || compactScene;

  if (!supportsWebGL) {
    return <div className="studio-object-fallback" />;
  }

  return (
    <div className="prototype-canvas-root" ref={root}>
      <Canvas
        shadows
        camera={{ fov: 28, near: 0.1, far: 30, position: [4.2, 3.1, 6.4] }}
        dpr={[1, 1.5]}
        frameloop={isVisible && !isStatic ? "always" : "demand"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight
          castShadow
          color="#fff4df"
          intensity={1.75}
          position={[4.5, 6, 4]}
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight color="#d8c8aa" intensity={0.3} position={[-4, 2, -2]} />
        <CameraAim />
        <PrototypeAssembly staticScene={isStatic} />
      </Canvas>
    </div>
  );
}

function CameraAim() {
  const { camera } = useThree();

  useFrame(() => {
    camera.lookAt(0, 0.46, 0);
  });

  return null;
}

function PrototypeAssembly({ staticScene }: { staticScene: boolean }) {
  const assembly = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!assembly.current) return;

    const targetRotationY = staticScene ? -0.34 : -0.34 + state.pointer.x * 0.045;
    const targetRotationX = staticScene ? -0.05 : -0.05 - state.pointer.y * 0.028;
    const targetY = staticScene ? -0.02 : -0.02 + Math.min(window.scrollY / 1800, 1) * 0.045;

    assembly.current.rotation.y = MathUtils.damp(
      assembly.current.rotation.y,
      targetRotationY,
      4.2,
      delta,
    );
    assembly.current.rotation.x = MathUtils.damp(
      assembly.current.rotation.x,
      targetRotationX,
      4.2,
      delta,
    );
    assembly.current.position.y = MathUtils.damp(
      assembly.current.position.y,
      targetY,
      4.2,
      delta,
    );
  });

  return (
    <group ref={assembly} rotation={[-0.05, -0.34, 0]}>
      <ShadowCatcher />
      <PaperLayer color="#e8dfd0" depth={0.18} position={[0, 0, 0]} size={[3.7, 2.55]} />
      <PaperLayer color="#f7f0e4" depth={0.1} position={[-0.08, 0.17, 0.03]} size={[3.44, 2.32]} scrollLift={0.035} staticScene={staticScene} />
      <PaperLayer color="#eee4d4" depth={0.08} position={[0.16, 0.31, -0.06]} size={[3.08, 2.06]} scrollLift={0.07} staticScene={staticScene} />
      <AcrylicPlate staticScene={staticScene} />
      <PerforatedPanel />
      <BrassPin position={[-0.88, 0.54, 0.48]} />
      <BrassPin position={[0.7, 0.54, -0.38]} />
      <BrassPin position={[0.15, 0.98, 0.18]} small />
    </group>
  );
}

function PaperLayer({
  color,
  depth,
  position,
  size,
  scrollLift = 0,
  staticScene = true,
}: {
  color: string;
  depth: number;
  position: [number, number, number];
  size: [number, number];
  scrollLift?: number;
  staticScene?: boolean;
}) {
  const layer = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!layer.current || staticScene || scrollLift === 0) return;
    const progress = Math.min(window.scrollY / 1600, 1);
    layer.current.position.y = MathUtils.damp(
      layer.current.position.y,
      position[1] + progress * scrollLift,
      3.2,
      delta,
    );
  });

  return (
    <group ref={layer} position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size[0], depth, size[1]]} />
        <meshStandardMaterial color={color} roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[0, depth / 2 + 0.003, 0]} receiveShadow>
        <planeGeometry args={[size[0] - 0.12, size[1] - 0.12]} />
        <meshStandardMaterial color="#fffaf0" roughness={1} />
      </mesh>
    </group>
  );
}

function AcrylicPlate({ staticScene }: { staticScene: boolean }) {
  const plate = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!plate.current || staticScene) return;
    const progress = Math.min(window.scrollY / 1600, 1);
    plate.current.position.y = MathUtils.damp(plate.current.position.y, 0.6 + progress * 0.09, 3.2, delta);
  });

  return (
    <group ref={plate} position={[0.03, 0.6, 0.02]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 2.04]} />
        <meshPhysicalMaterial
          color="#f8f1e6"
          transparent
          opacity={0.42}
          roughness={0.08}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
      <group position={[0, 0.04, 0]}>
        <AcrylicRail position={[0, 0, -0.84]} size={[2.9, 0.05, 0.035]} />
        <AcrylicRail position={[-1.3, 0, 0]} size={[0.035, 0.05, 1.72]} />
        <AcrylicRail position={[1.3, 0, 0]} size={[0.035, 0.05, 1.72]} />
      </group>
    </group>
  );
}

function AcrylicRail({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color="#f9f3e9" transparent opacity={0.68} roughness={0.12} depthWrite={false} />
    </mesh>
  );
}

function PerforatedPanel() {
  const dots = Array.from({ length: 12 }, (_, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return [-0.32 + column * 0.32, -0.34 + row * 0.23] as const;
  });

  return (
    <group position={[0.75, 1.16, -0.72]} rotation={[0, -0.1, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.52, 1.36, 0.045]} />
        <meshPhysicalMaterial color="#f4ecde" transparent opacity={0.44} roughness={0.1} depthWrite={false} />
      </mesh>
      {dots.map(([x, y], index) => (
        <mesh key={index} position={[x, y, 0.03]}>
          <circleGeometry args={[0.027, 12]} />
          <meshBasicMaterial color="#b9ab95" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function BrassPin({ position, small = false }: { position: [number, number, number]; small?: boolean }) {
  const radius = small ? 0.055 : 0.07;
  const height = small ? 0.17 : 0.24;

  return (
    <mesh castShadow position={position}>
      <cylinderGeometry args={[radius, radius, height, 24]} />
      <meshStandardMaterial color="#9d742f" roughness={0.34} metalness={0.62} />
    </mesh>
  );
}

function ShadowCatcher() {
  return (
    <mesh receiveShadow position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[6.8, 5.2]} />
      <shadowMaterial transparent opacity={0.14} />
    </mesh>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function useMediaQuery(queryText: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(queryText);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [queryText]);

  return matches;
}

function useWebGLSupport() {
  const [supportsWebGL, setSupportsWebGL] = useState(true);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    setSupportsWebGL(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
  }, []);

  return supportsWebGL;
}

function useCanvasVisibility(element: RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!element.current || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );

    observer.observe(element.current);
    return () => observer.disconnect();
  }, [element]);

  return isVisible;
}

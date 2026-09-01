import { lazy, Suspense, useEffect, useState } from "react";

const DotMatrixBackground = lazy(async () => {
  const module = await import(
    "@designcodeio/threeui/components/DotMatrixBackground"
  );

  return { default: module.DotMatrixBackground };
});

function useInteractiveField() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 861px)");
    const update = () => setEnabled(!motionQuery.matches && desktopQuery.matches);

    update();
    motionQuery.addEventListener("change", update);
    desktopQuery.addEventListener("change", update);

    return () => {
      motionQuery.removeEventListener("change", update);
      desktopQuery.removeEventListener("change", update);
    };
  }, []);

  return enabled;
}

function StaticField() {
  return (
    <div className="habitat-research-static" aria-hidden="true">
      <span className="habitat-research-static-mark habitat-research-static-mark-a" />
      <span className="habitat-research-static-mark habitat-research-static-mark-b" />
      <span className="habitat-research-static-mark habitat-research-static-mark-c" />
    </div>
  );
}

export function HabitatResearchField() {
  const interactive = useInteractiveField();

  return (
    <div className="habitat-research-field" aria-hidden="true">
      {interactive ? (
        <Suspense fallback={<StaticField />}>
          <DotMatrixBackground
            className="habitat-research-canvas"
            gridScale={74}
            hue={0}
            mouseAmount={0.012}
            opacity={0.1}
            pulseSpeed={0.08}
            radius={0.05}
            speed={0.14}
          />
        </Suspense>
      ) : (
        <StaticField />
      )}
      <span className="habitat-research-label habitat-research-label-top">
        Observation field
      </span>
      <span className="habitat-research-label habitat-research-label-bottom">
        Trace 01
      </span>
    </div>
  );
}

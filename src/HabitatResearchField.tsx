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
    const desktopQuery = window.matchMedia("(min-width: 861px)");
    const update = () => setEnabled(desktopQuery.matches);

    update();
    desktopQuery.addEventListener("change", update);

    return () => {
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
  const [traceNumber, setTraceNumber] = useState(1);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!interactive || prefersReducedMotion) {
      setTraceNumber(1);
      return;
    }

    const intervalId = window.setInterval(() => {
      setTraceNumber((current) => (current % 3) + 1);
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [interactive]);

  return (
    <div className="habitat-research-field" aria-hidden="true">
      {interactive ? (
        <Suspense fallback={<StaticField />}>
          <DotMatrixBackground
            className="habitat-research-canvas"
            gridScale={58}
            hue={0}
            mouseAmount={0.032}
            opacity={0.42}
            pulseSpeed={0.72}
            radius={0.12}
            speed={0.58}
          />
        </Suspense>
      ) : (
        <StaticField />
      )}
      <span className="habitat-research-label habitat-research-label-top">
        Observation field
      </span>
      <span className="habitat-research-label habitat-research-label-bottom">
        Trace {String(traceNumber).padStart(2, "0")}
      </span>
    </div>
  );
}

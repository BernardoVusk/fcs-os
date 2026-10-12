import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function assinar(aoMudar: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", aoMudar);
  return () => mql.removeEventListener("change", aoMudar);
}

/** Largura abaixo de 768 px. No servidor devolve false. */
export function useIsMobile() {
  return React.useSyncExternalStore(
    assinar,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}

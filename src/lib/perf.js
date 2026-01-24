export function shouldUsePerfLite() {
  try {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return true;

    const deviceMemory = typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 8;
    const hardwareConcurrency =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 8;

    return deviceMemory <= 4 || hardwareConcurrency <= 4;
  } catch {
    return false;
  }
}

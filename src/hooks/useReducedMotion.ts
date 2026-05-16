import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Tracks the OS-level "reduce motion" accessibility setting. Use this to swap
 * spring/long animations for snappy fades when the user has the system flag on.
 *
 * iOS: Settings → Accessibility → Motion → Reduce Motion.
 * Android: Settings → Accessibility → Remove animations.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) setReduced(value);
    });

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => setReduced(value),
    );

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced;
}

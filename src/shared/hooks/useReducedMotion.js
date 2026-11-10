import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Follows the OS "Reduce Motion" setting (iOS/Android) and prefers-reduced-motion on web.
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((value) => { if (alive) setReduced(!!value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => setReduced(!!value));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduced;
}

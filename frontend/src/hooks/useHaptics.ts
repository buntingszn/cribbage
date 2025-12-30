/**
 * Hook for triggering haptic feedback on mobile devices.
 * Uses the Vibration API when available.
 */

export type HapticPattern = 'selection' | 'impact' | 'success' | 'warning' | 'error';

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  selection: 10,      // Light tap for card selection
  impact: 20,         // Medium tap for card play
  success: [10, 50, 10],    // Double tap for points scored
  warning: [30, 20, 30],    // Alert pattern for "Go"
  error: [50, 30, 50, 30, 50], // Strong pattern for invalid move
};

export function useHaptics() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = (pattern: HapticPattern) => {
    if (isSupported) {
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {
        // Vibration API may throw in some contexts
      }
    }
  };

  const cancel = () => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  };

  return { trigger, cancel, isSupported };
}

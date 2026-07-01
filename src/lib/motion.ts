/**
 * Shared motion language for Money Map. Timings are tuned a notch calmer than
 * the impeccable defaults to fit the calm/precise register. Retune all
 * JS-driven motion at once by editing the values here.
 */

/** Confident ease-out curve (ease-out-quint). Mirrors --ease-out-quint in globals.css. */
export const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** framer-motion durations (seconds). */
export const MOTION_DURATION = {
  micro: 0.3, // small item reveals (FAB items, small fades)
  entrance: 0.4, // list-item entrance
  reveal: 0.7, // bars and larger reveals
};

/** per-item stagger delay (seconds). */
export const STAGGER_STEP = 0.07;

/** spring count-up duration for AnimatedNumber-style figures (ms). */
export const COUNT_UP_MS = 1000;

/** recharts area draw-in duration (ms). */
export const CHART_DRAW_MS = 1100;

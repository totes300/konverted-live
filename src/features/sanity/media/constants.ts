export const DEFAULT_MAX_WIDTH = 3072;
/** Clamping a tall frame's height clamps its width too, so this clears 3072 / 0.75: a valve for extreme ratios, not a routine bound. */
export const DEFAULT_MAX_HEIGHT = 4096;
/** Tiny LQIP for the Suspense fallback shown before the <mux-player> chunk loads. */
export const POSTER_PREVIEW_MAX_EDGE = 160;
/** Sharp poster passed to <mux-player>; shown until playback starts, so it must look crisp. */
export const POSTER_PLAYER_MAX_EDGE = 960;
export const DEFAULT_SOURCE_WIDTHS = [600, 1024, 1440, 2048, 2560, 3072];

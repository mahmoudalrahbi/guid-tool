const CONFIG = {
  DB: {
    NAME: "localguide",
    VERSION: 1, // WARNING: If incremented, you must add migration logic to onupgradeneeded in db-core.js
  },
  STORE_GUIDES: "guides",
  STORE_STEPS: "steps",

  CAPTURE_FORMAT: "jpeg", // WARNING: Changing to 'png' will ignore quality settings and increase IndexedDB storage usage by 5-10x per step.
  CAPTURE_QUALITY: 80, // JPEG quality (0-100 integer) for the raw tab screenshot

  // Discrepancy explained: Annotated quality is slightly higher (0.82 vs 0.80) to preserve circle edge clarity after redrawing
  ANNOTATED_QUALITY: 0.82, // JPEG quality (0.0-1.0 float) after the annotation circle is drawn

  ANNOTATION: {
    RADIUS_PX: 28,
    STROKE_WIDTH_PX: 3,
    COLOR: "#f59e0b"
  },

  EDITOR: {
    AUTOSAVE_DEBOUNCE_MS: 700,
    UNDO_TIMEOUT_MS: 3800
  },

  UI_MAX_DESC_LEN: 120,
  UI_NAV_DELAY_MS: 500,
  UI_TOAST_ANIMATION_MS: 200,
  UI_TOAST_FADEOUT_MS: 220,
  UI_DRAG_THRESHOLD: 80,
};

Object.freeze(CONFIG);
// Note: We don't deep freeze nested objects because they are read-only in our usage anyway, but consider deep freeze if needed.

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}

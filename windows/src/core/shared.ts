// Small cross-module state the island chrome needs (compact-view priority rules).
// Modules write here; core/renderer reads.
export const shared = {
  /** Set by the Now Playing module. */
  mediaPlaying: false,
  mediaTitle: "",
  /** True while the OS reports a fullscreen / presentation app in front (hide-on-fullscreen). */
  fullscreenActive: false,
};

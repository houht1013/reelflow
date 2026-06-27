// Resolved Video IR — the fully concrete, per-job output of running a structure
// engine (recipe + user input). All media are real public URLs and all times
// are resolved to milliseconds on one global timeline. The single capcut
// renderer translates this into capcut-mate calls (and gen_video for MP4). The
// IR is persisted per job for reproducibility / preview / debugging.
//
// IR is the ONLY thing the renderer understands — engines vary, IR is stable.

export type ResolvedVisual =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string; trim?: { startMs: number; endMs: number } };

export type ResolvedMotion =
  | { type: 'none' }
  | { type: 'ken_burns'; from: number; to: number; anchor?: 'center' | 'top' | 'bottom' }
  | { type: 'pan'; axis: 'x' | 'y'; amount: number };

export type ResolvedTransition = { type: 'none' } | { type: 'effect'; id: string; durationMs: number };

export type ResolvedCaption = { startMs: number; endMs: number; text: string };

export type ResolvedTextOverlay = {
  type: 'text';
  text: string;
  highlight?: string;
  startMs: number;
  endMs: number;
  styleId?: string;
};

export type ResolvedShot = {
  id: string;
  /** Global timeline placement. */
  startMs: number;
  endMs: number;
  visual: ResolvedVisual;
  motion?: ResolvedMotion;
  transitionIn?: ResolvedTransition;
  /** Per-shot narration audio (already hosted). */
  audioUrl?: string;
  audioDurationMs?: number;
  captions: ResolvedCaption[];
  overlays?: ResolvedTextOverlay[];
};

export type ResolvedBgm = { url: string; volume: number; duck: boolean };

export type ResolvedCaptionStyle = {
  fontSize?: number;
  transformY?: number;
  textColor?: string;
  borderColor?: string;
  alignment?: number;
};

export type ResolvedVideo = {
  canvas: { width: number; height: number; fps?: number };
  shots: ResolvedShot[];
  bgm?: ResolvedBgm;
  captionStyle?: ResolvedCaptionStyle;
  delivery: { draft: boolean; mp4: 'off' | 'optional' | 'always' };
  /** Free-form notes for preview/debug (script json, seeds, costs…). */
  meta?: Record<string, unknown>;
};

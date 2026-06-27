// Pure, narration-driven timeline assembler. Given per-shot drafts (already
// resolved to media URLs + narration durations + relative caption segments), lay
// them sequentially on one global timeline and produce a Resolved Video IR.
// Pure + deterministic → unit-testable without providers.
import type {
  ResolvedVideo,
  ResolvedShot,
  ResolvedVisual,
  ResolvedMotion,
  ResolvedTransition,
  ResolvedCaptionStyle,
  ResolvedBgm,
  ResolvedTextOverlay,
} from './ir';

/** One shot's resolved inputs, with caption times RELATIVE to the shot start. */
export type ShotDraft = {
  id: string;
  visual: ResolvedVisual;
  audioUrl?: string;
  /** Narration duration drives the shot length (narration-driven pacing). */
  narrationDurationMs: number;
  captions: { startMs: number; endMs: number; text: string }[];
  motion?: ResolvedMotion;
  transitionIn?: ResolvedTransition;
  overlays?: Omit<ResolvedTextOverlay, 'startMs' | 'endMs'>[];
};

export type AssembleTimelineOptions = {
  canvas: { width: number; height: number; fps?: number };
  shots: ShotDraft[];
  captionStyle?: ResolvedCaptionStyle;
  bgm?: ResolvedBgm;
  delivery: { draft: boolean; mp4: 'off' | 'optional' | 'always' };
  meta?: Record<string, unknown>;
};

export function assembleTimeline(opts: AssembleTimelineOptions): ResolvedVideo {
  const shots: ResolvedShot[] = [];
  let cursor = 0;
  for (const draft of opts.shots) {
    const dur = Math.max(0, Math.round(draft.narrationDurationMs));
    const startMs = cursor;
    const endMs = cursor + dur;
    shots.push({
      id: draft.id,
      startMs,
      endMs,
      visual: draft.visual,
      motion: draft.motion,
      transitionIn: draft.transitionIn,
      audioUrl: draft.audioUrl,
      audioDurationMs: dur,
      captions: draft.captions.map((c) => ({
        startMs: startMs + c.startMs,
        endMs: startMs + c.endMs,
        text: c.text,
      })),
      overlays: draft.overlays?.map((o) => ({ ...o, startMs, endMs })),
    });
    cursor = endMs;
  }

  return {
    canvas: opts.canvas,
    shots,
    bgm: opts.bgm,
    captionStyle: opts.captionStyle,
    delivery: opts.delivery,
    meta: { ...(opts.meta ?? {}), totalDurationMs: cursor },
  };
}

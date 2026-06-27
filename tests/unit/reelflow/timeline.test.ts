import { describe, expect, it } from 'vitest'
import { assembleTimeline, type ShotDraft } from '@libs/reelflow/templates/_recipe/timeline'

const shot = (id: string, dur: number, captions: { startMs: number; endMs: number; text: string }[]): ShotDraft => ({
  id,
  visual: { kind: 'image', url: `https://x/${id}.png` },
  audioUrl: `https://x/${id}.mp3`,
  narrationDurationMs: dur,
  captions,
})

describe('assembleTimeline (narration-driven)', () => {
  it('lays shots sequentially with cumulative start/end', () => {
    const ir = assembleTimeline({
      canvas: { width: 1080, height: 1920 },
      delivery: { draft: true, mp4: 'optional' },
      shots: [shot('s1', 3000, []), shot('s2', 2500, []), shot('s3', 4000, [])],
    })
    expect(ir.shots.map((s) => [s.startMs, s.endMs])).toEqual([
      [0, 3000],
      [3000, 5500],
      [5500, 9500],
    ])
    expect(ir.meta?.totalDurationMs).toBe(9500)
  })

  it('shifts caption times by the shot start', () => {
    const ir = assembleTimeline({
      canvas: { width: 1080, height: 1920 },
      delivery: { draft: true, mp4: 'off' },
      shots: [
        shot('s1', 3000, [{ startMs: 0, endMs: 3000, text: 'a' }]),
        shot('s2', 2000, [{ startMs: 0, endMs: 1000, text: 'b' }, { startMs: 1000, endMs: 2000, text: 'c' }]),
      ],
    })
    expect(ir.shots[1].captions).toEqual([
      { startMs: 3000, endMs: 4000, text: 'b' },
      { startMs: 4000, endMs: 5000, text: 'c' },
    ])
    // audioDurationMs mirrors narration duration
    expect(ir.shots[1].audioDurationMs).toBe(2000)
  })

  it('carries visual + delivery + caption style through', () => {
    const ir = assembleTimeline({
      canvas: { width: 720, height: 1280, fps: 30 },
      delivery: { draft: true, mp4: 'always' },
      captionStyle: { fontSize: 14, transformY: 600 },
      shots: [shot('s1', 1000, [])],
    })
    expect(ir.canvas).toEqual({ width: 720, height: 1280, fps: 30 })
    expect(ir.delivery.mp4).toBe('always')
    expect(ir.captionStyle?.fontSize).toBe(14)
    expect(ir.shots[0].visual).toEqual({ kind: 'image', url: 'https://x/s1.png' })
  })

  it('handles empty shot list', () => {
    const ir = assembleTimeline({ canvas: { width: 1080, height: 1920 }, delivery: { draft: true, mp4: 'off' }, shots: [] })
    expect(ir.shots).toEqual([])
    expect(ir.meta?.totalDurationMs).toBe(0)
  })
})

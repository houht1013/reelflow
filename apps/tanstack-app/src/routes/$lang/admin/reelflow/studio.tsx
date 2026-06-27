import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { requireAdmin } from '@/lib/auth-guard'
import { Button } from '@libs/react-shared/ui/button'
import { Upload } from 'lucide-react'

// Reelflow template Studio — a React Flow canvas that renders a PreviewResult
// (from `reelflow preview --out x.json`) as the pipeline graph: Recipe → Script
// → Shot cards → Output (draft + MP4). Viewer/comparator first; annotation +
// feedback-to-agent land next. Admin/dev tool, zh labels inline.
export const Route = createFileRoute('/$lang/admin/reelflow/studio')({
  beforeLoad: async ({ params }) => {
    await requireAdmin({ params: params as { lang: string } })
  },
  component: StudioPage,
})

type Shot = { index: number; visual: { kind: string; url: string }; startMs: number; endMs: number; narration: string; audioUrl?: string }
type PreviewResult = {
  recipe: { code: string; version: string; name: string; structure: string }
  script?: unknown
  shots: Shot[]
  draftUrl: string | null
  mp4Url: string | null
  durationMs: number
  estimate?: Record<string, unknown>
}

function StudioPage() {
  const [mounted, setMounted] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  const loadJson = useCallback((text: string) => {
    try {
      const data = JSON.parse(text) as PreviewResult
      if (!data?.recipe || !Array.isArray(data.shots)) throw new Error('不是有效的 PreviewResult JSON')
      setPreview(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败')
    }
  }, [])

  const onFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => loadJson(String(reader.result || ''))
      reader.readAsText(file)
    },
    [loadJson],
  )

  const { nodes, edges } = useMemo(() => buildGraph(preview), [preview])

  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
        <div className="min-w-0">
          <h1 className="reelflow-display text-lg">模板 Studio · 预览画布</h1>
          <p className="truncate text-xs text-muted-foreground">
            加载 <code>reelflow preview --out result.json</code> 的产物，按管线对照查看
          </p>
        </div>
        <div className="flex items-center gap-2">
          {preview && (
            <span className="text-xs text-muted-foreground">
              {preview.recipe.code} v{preview.recipe.version} · {preview.shots.length} 镜 · {(preview.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          <Button asChild size="sm" variant="outline">
            <label className="cursor-pointer">
              <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
              加载 JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
          </Button>
        </div>
      </div>

      {error && <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-sm text-destructive">{error}</div>}

      <div className="relative flex-1">
        {!preview ? (
          <DropArea onText={loadJson} onFile={onFile} />
        ) : mounted ? (
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={NODE_TYPES} fitView proOptions={{ hideAttribution: true }} minZoom={0.2}>
            <Background gap={20} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        ) : null}
      </div>
    </div>
  )
}

function DropArea({ onText, onFile }: { onText: (t: string) => void; onFile: (f: File) => void }) {
  const [text, setText] = useState('')
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 p-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
    >
      <p className="text-sm text-muted-foreground">拖入 / 选择 PreviewResult JSON，或粘贴：</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{ "recipe": …, "shots": [ … ] }'
        className="h-48 w-full max-w-2xl rounded-lg border border-border bg-background p-3 font-mono text-xs"
      />
      <Button onClick={() => onText(text)} disabled={!text.trim()}>
        渲染画布
      </Button>
    </div>
  )
}

// ---- Custom nodes ----
function CardNode({ data }: NodeProps) {
  const d = data as { title: string; subtitle?: string; body?: React.ReactNode; tone?: string }
  return (
    <div className={`w-64 rounded-xl border bg-card p-3 shadow-sm ${d.tone === 'accent' ? 'border-primary/50' : 'border-border'}`}>
      <div className="text-xs font-semibold text-foreground">{d.title}</div>
      {d.subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{d.subtitle}</div>}
      {d.body && <div className="mt-2 text-[11px] text-muted-foreground">{d.body}</div>}
    </div>
  )
}

function ShotNode({ data }: NodeProps) {
  const d = data as { index: number; url: string; narration: string; timing: string }
  return (
    <div className="w-52 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="aspect-[9/16] max-h-48 w-full overflow-hidden bg-muted">
        <img src={d.url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>镜 {d.index + 1}</span>
          <span className="reelflow-num">{d.timing}</span>
        </div>
        <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-foreground">{d.narration}</p>
      </div>
    </div>
  )
}

function OutputNode({ data }: NodeProps) {
  const d = data as { mp4Url: string | null; draftUrl: string | null; duration: string }
  return (
    <div className="w-72 rounded-xl border border-primary/50 bg-card p-3 shadow-sm">
      <div className="text-xs font-semibold">产物 · {d.duration}</div>
      {d.mp4Url ? (
        <video src={d.mp4Url} controls className="mt-2 w-full rounded-lg" />
      ) : (
        <div className="mt-2 rounded-lg bg-muted px-3 py-6 text-center text-[11px] text-muted-foreground">MP4 生成中 / 无</div>
      )}
      {d.draftUrl && (
        <a href={d.draftUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-[11px] text-primary hover:underline">
          剪映草稿链接 ↗
        </a>
      )}
    </div>
  )
}

const NODE_TYPES = { card: CardNode, shot: ShotNode, output: OutputNode }

function buildGraph(preview: PreviewResult | null): { nodes: Node[]; edges: Edge[] } {
  if (!preview) return { nodes: [], edges: [] }
  const nodes: Node[] = []
  const edges: Edge[] = []

  nodes.push({
    id: 'recipe',
    type: 'card',
    position: { x: 0, y: 200 },
    data: { title: `配方 · ${preview.recipe.name}`, subtitle: `${preview.recipe.code} v${preview.recipe.version}`, body: `结构: ${preview.recipe.structure}`, tone: 'accent' },
  })
  nodes.push({
    id: 'script',
    type: 'card',
    position: { x: 300, y: 200 },
    data: { title: '脚本', subtitle: `${preview.shots.length} 个分镜`, body: '由 LLM 生成' },
  })
  edges.push({ id: 'e-recipe-script', source: 'recipe', target: 'script', animated: true })

  preview.shots.forEach((s, i) => {
    const id = `shot-${i}`
    nodes.push({
      id,
      type: 'shot',
      position: { x: 620, y: i * 280 },
      data: { index: s.index, url: s.visual.url, narration: s.narration, timing: `${(s.startMs / 1000).toFixed(1)}-${(s.endMs / 1000).toFixed(1)}s` },
    })
    edges.push({ id: `e-script-${id}`, source: 'script', target: id })
    edges.push({ id: `e-${id}-out`, source: id, target: 'output' })
  })

  nodes.push({
    id: 'output',
    type: 'output',
    position: { x: 960, y: 200 },
    data: { mp4Url: preview.mp4Url, draftUrl: preview.draftUrl, duration: `${(preview.durationMs / 1000).toFixed(1)}s` },
  })

  return { nodes, edges }
}

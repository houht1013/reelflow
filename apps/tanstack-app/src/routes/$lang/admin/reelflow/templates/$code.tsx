import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { lazy, Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Textarea } from '@libs/react-shared/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Loader2, Play, Save, ShieldCheck, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/reelflow-ui'
import { useTranslation } from '@/hooks/use-translation'

export const Route = createFileRoute('/$lang/admin/reelflow/templates/$code')({
  head: ({ params }) => seoHead(params.lang, () => ({ title: '模板编辑器', description: '视频模板代码编辑与调试' })),
  component: TemplateEditorPage,
})

// Monaco is browser-only — lazy-load so it is never evaluated during SSR.
const Editor = lazy(() => import('@monaco-editor/react'))

type FieldDef = { key: string; defaultValue?: unknown; placeholder?: string; required?: boolean }
type Validation = { ok: boolean; errors: string[]; meta?: { code: string; name: string; version: string; fields: number; outputs: number; fieldDefs?: FieldDef[] } }

function TemplateEditorPage() {
  const { code } = Route.useParams()
  const { locale } = useTranslation()
  const navigate = useNavigate()
  const isNew = code === 'new'

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editable, setEditable] = useState(true)
  const [slug, setSlug] = useState(isNew ? '' : code)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<Validation | null>(null)

  const [inputJson, setInputJson] = useState('{}')
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runDraftUrl, setRunDraftUrl] = useState<string | null>(null)
  const [runJobId, setRunJobId] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Prefill example params from the validated field defs.
  useEffect(() => {
    const defs = validation?.meta?.fieldDefs
    if (!defs || inputJson !== '{}') return
    const example: Record<string, unknown> = {}
    for (const f of defs) {
      if (f.defaultValue !== undefined) example[f.key] = f.defaultValue
      else if (f.required) example[f.key] = f.placeholder || ''
    }
    setInputJson(JSON.stringify(example, null, 2))
  }, [validation, inputJson])

  const runPreview = async () => {
    const targetCode = (isNew ? slug : code).trim()
    if (!targetCode || !validation?.ok) { toast.error('请先保存并通过校验'); return }
    let inputParams: unknown
    try { inputParams = JSON.parse(inputJson || '{}') } catch { toast.error('参数不是合法 JSON'); return }
    setRunning(true); setRunError(null); setRunDraftUrl(null); setRunStatus('queued'); setRunJobId(null)
    try {
      const res = await fetch(`/api/admin/reelflow/templates/${targetCode}/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputParams }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '试运行失败')
      const jobId = data.jobId as string
      setRunJobId(jobId)
      // Poll until terminal (~10 min cap).
      const deadline = Date.now() + 600_000
      for (;;) {
        await new Promise((r) => setTimeout(r, 4000))
        const detail = await (await fetch(`/api/reelflow/jobs/${jobId}`)).json()
        const status = detail?.job?.status as string
        setRunStatus(status)
        if (status === 'completed') {
          const draft = (detail?.runResult?.assets || []).find((a: { type: string }) => a.type === 'draft')
          setRunDraftUrl(draft?.url || null)
          break
        }
        if (status === 'failed') { setRunError(detail?.job?.lastErrorMessage || '任务失败'); break }
        if (Date.now() > deadline) { setRunError('试运行超时'); break }
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : '试运行失败')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/reelflow/templates/${code}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || '加载失败')
        if (!alive) return
        setContent(data.content || '')
        setEditable(Boolean(data.editable))
        if (isNew) {
          const m = /code:\s*['"]([a-z0-9_]+)['"]/.exec(data.content || '')
          if (m) setSlug(m[1])
        }
      } catch (err) {
        if (alive) toast.error(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [code, isNew])

  const save = async () => {
    const targetCode = (isNew ? slug : code).trim()
    if (!targetCode) { toast.error('请填写模板 code'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/reelflow/templates/${targetCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '保存失败')
      setValidation(data.validation)
      if (data.validation?.ok) toast.success('已保存，校验通过')
      else toast.warning('已保存，但校验有问题')
      if (isNew && data.saved) {
        navigate({ to: '/$lang/admin/reelflow/templates/$code', params: { lang: locale, code: targetCode } })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const validate = async () => {
    const targetCode = (isNew ? slug : code).trim()
    if (!targetCode) { toast.error('请先保存'); return }
    setValidating(true)
    try {
      const res = await fetch(`/api/admin/reelflow/templates/${targetCode}/validate`, { method: 'POST' })
      const data = await res.json()
      setValidation(data)
    } catch {
      toast.error('校验失败')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/$lang/admin/reelflow/templates" params={{ lang: locale }} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />返回模板列表
      </Link>
      <PageHeader
        title={isNew ? '新建模板' : `编辑模板 · ${code}`}
        description={editable ? '编写高代码模板（defineTemplate + SDK），保存后自动校验并热加载。' : '内置模板在代码仓库维护，此处只读。'}
        actions={
          editable ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void validate()} disabled={validating || saving}>
                {validating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}校验
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}保存
              </Button>
            </div>
          ) : undefined
        }
      />

      {isNew && (
        <div className="reelflow-panel max-w-md p-4">
          <Label className="text-xs text-muted-foreground">模板 code（唯一，小写字母/数字/下划线）</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my_template_001" className="mt-1.5 font-mono" />
          <p className="mt-1.5 text-xs text-muted-foreground">需与代码中的 <span className="font-mono">code:</span> 一致。</p>
        </div>
      )}

      {validation && (
        <Alert variant={validation.ok ? 'default' : 'destructive'}>
          {validation.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{validation.ok ? '校验通过' : '校验未通过'}</AlertTitle>
          <AlertDescription>
            {validation.ok ? (
              <span className="text-sm">{validation.meta?.name}（{validation.meta?.code} v{validation.meta?.version}）· {validation.meta?.fields} 字段 / {validation.meta?.outputs} 产物</span>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {editable && validation?.ok && (
        <div className="reelflow-panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="reelflow-display text-lg">调试 / 试运行</h3>
            <Button size="sm" onClick={() => void runPreview()} disabled={running}>
              {running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}试运行
            </Button>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">示例参数（JSON）</Label>
            <Textarea value={inputJson} onChange={(e) => setInputJson(e.target.value)} className="mt-1.5 min-h-28 font-mono text-xs" />
          </div>
          {(runStatus || runError) && (
            <div className="reelflow-muted-tile p-3 text-sm">
              <div className="flex items-center gap-2">状态：<span className="reelflow-num">{runError ? '失败' : runStatus}</span>{running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</div>
              {runError && <p className="mt-1 text-destructive">{runError}</p>}
              {runDraftUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <Input readOnly value={runDraftUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(runDraftUrl); toast.success('已复制') }}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" asChild><a href={runDraftUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                </div>
              )}
              {runJobId && (
                <Link to="/$lang/reelflow/jobs/$id" params={{ lang: locale, id: runJobId }} className="mt-2 inline-block text-xs text-primary hover:underline">查看任务详情 →</Link>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">试运行会在你的工作区真实生成（消耗积分），用于调试。调好后点「上架发布」。</p>
        </div>
      )}

      <div className="reelflow-panel overflow-hidden">
        {loading || !mounted ? (
          <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            <Editor
              height="60vh"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={content}
              onChange={(value) => setContent(value ?? '')}
              options={{ readOnly: !editable, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 2, automaticLayout: true }}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

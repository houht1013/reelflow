import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Switch } from '@libs/react-shared/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Loader2, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/admin/reelflow/models')({
  head: ({ params }) => seoHead(params.lang, () => ({ title: '模型管理', description: 'AI 模型与接入点管理' })),
  component: ModelsAdminPage,
})

type AiModelRow = {
  id: string
  category: string
  code: string
  displayName: string
  provider: string
  protocol: string
  baseUrl: string | null
  modelId: string | null
  enabled: boolean
  isDefault: boolean
  priority: number
  config: Record<string, unknown> | null
  pricingMode: string
  creditUnitPrice: string
  pricingUnit: string | null
  minCreditCost: string | null
  hasApiKey: boolean
  apiKeyMasked: string | null
}

const CATEGORIES = [
  { value: 'text', label: '文本' },
  { value: 'image', label: '生图' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
]
const PROTOCOLS = ['openai-chat', 'openai-image', 'seedream', 'dubbingx', 'capcut', 'other']
const PRICING_MODES = [
  { value: 'per_call', label: '按次' },
  { value: 'per_token', label: '按 tokens' },
  { value: 'per_time', label: '按时间' },
]
const pricingLabel = (v: string) => PRICING_MODES.find((p) => p.value === v)?.label || v

type FormState = {
  id?: string
  category: string
  code: string
  displayName: string
  provider: string
  protocol: string
  baseUrl: string
  apiKey: string
  modelId: string
  enabled: boolean
  isDefault: boolean
  priority: number
  pricingMode: string
  creditUnitPrice: number
  pricingUnit: string
  config: string
}

const emptyForm = (category: string): FormState => ({
  category, code: '', displayName: '', provider: '', protocol: 'openai-image', baseUrl: '', apiKey: '', modelId: '',
  enabled: true, isDefault: false, priority: 100, pricingMode: 'per_call', creditUnitPrice: 0, pricingUnit: 'call', config: '',
})

function ModelsAdminPage() {
  const [models, setModels] = useState<AiModelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('image')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm('image'))
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reelflow/models')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '加载失败')
      setModels(data.models || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const rows = useMemo(() => models.filter((m) => m.category === tab), [models, tab])

  const openCreate = () => { setForm(emptyForm(tab)); setDialogOpen(true) }
  const openEdit = (m: AiModelRow) => {
    setForm({
      id: m.id, category: m.category, code: m.code, displayName: m.displayName, provider: m.provider, protocol: m.protocol,
      baseUrl: m.baseUrl || '', apiKey: '', modelId: m.modelId || '', enabled: m.enabled, isDefault: m.isDefault,
      priority: m.priority, pricingMode: m.pricingMode, creditUnitPrice: Number(m.creditUnitPrice || 0), pricingUnit: m.pricingUnit || '',
      config: m.config ? JSON.stringify(m.config, null, 2) : '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      let config: Record<string, unknown> | undefined
      if (form.config.trim()) {
        try { config = JSON.parse(form.config) } catch { throw new Error('config 不是合法 JSON') }
      }
      const payload: Record<string, unknown> = {
        category: form.category, code: form.code, displayName: form.displayName, provider: form.provider, protocol: form.protocol,
        baseUrl: form.baseUrl || null, modelId: form.modelId || null, enabled: form.enabled, isDefault: form.isDefault,
        priority: form.priority, pricingMode: form.pricingMode, creditUnitPrice: form.creditUnitPrice, pricingUnit: form.pricingUnit || null,
        config: config ?? null,
      }
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()
      const res = form.id
        ? await fetch(`/api/admin/reelflow/models/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/reelflow/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '保存失败')
      toast.success('已保存')
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/reelflow/models/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { toast.error('操作失败'); return }
    await load()
  }

  const remove = async (m: AiModelRow) => {
    if (!confirm(`删除模型「${m.displayName}」？`)) return
    const res = await fetch(`/api/admin/reelflow/models/${m.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('删除失败'); return }
    toast.success('已删除'); await load()
  }

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-6">
      <PageHeader title="模型管理" description="管理文本 / 生图 / 视频 / 音频 模型的供应商、协议、接入点、计价与启停。" />

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.value} type="button" onClick={() => setTab(c.value)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${tab === c.value ? `bg-primary text-primary-foreground` : `reelflow-muted-tile text-muted-foreground hover:text-foreground`}`}>
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1 h-4 w-4" />刷新</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增模型</Button>
        </div>
      </div>

      <div className="reelflow-panel p-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">该分类暂无模型，点击「新增模型」添加。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称 / Code</TableHead>
                <TableHead>供应商 / 协议</TableHead>
                <TableHead>模型 ID</TableHead>
                <TableHead>计价</TableHead>
                <TableHead>密钥</TableHead>
                <TableHead className="text-center">默认</TableHead>
                <TableHead className="text-center">启用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><div className="font-medium">{m.displayName}</div><div className="text-xs text-muted-foreground">{m.code}</div></TableCell>
                  <TableCell><div>{m.provider}</div><div className="text-xs text-muted-foreground">{m.protocol}</div></TableCell>
                  <TableCell className="text-sm">{m.modelId || "—"}</TableCell>
                  <TableCell className="text-sm">{pricingLabel(m.pricingMode)} · {Number(m.creditUnitPrice)}{m.pricingUnit ? `/${m.pricingUnit}` : ''}</TableCell>
                  <TableCell>{m.hasApiKey ? <span className="text-xs text-muted-foreground">{m.apiKeyMasked}</span> : <Badge variant="outline">未设置</Badge>}</TableCell>
                  <TableCell className="text-center">
                    <button type="button" onClick={() => void patch(m.id, { isDefault: true })} title="设为默认">
                      <Star className={`mx-auto h-4 w-4 ${m.isDefault ? `fill-yellow-400 text-yellow-400` : `text-muted-foreground`}`} />
                    </button>
                  </TableCell>
                  <TableCell className="text-center"><Switch checked={m.enabled} onCheckedChange={(v) => void patch(m.id, { enabled: v })} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => void remove(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? '编辑模型' : '新增模型'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="分类"><Select value={form.category} onValueChange={(v) => set({ category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="协议"><Select value={form.protocol} onValueChange={(v) => set({ protocol: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="名称"><Input value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} placeholder="如：Seedream 5.0" /></Field>
            <Field label="Code (唯一)"><Input value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder="如：seedream-5.0" /></Field>
            <Field label="供应商"><Input value={form.provider} onChange={(e) => set({ provider: e.target.value })} placeholder="如：doubao" /></Field>
            <Field label="模型 ID (上游)"><Input value={form.modelId} onChange={(e) => set({ modelId: e.target.value })} placeholder="doubao-seedream-5-0-260128:stable" /></Field>
            <Field label="Base URL" full><Input value={form.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="https://api.opclab.vip" /></Field>
            <Field label={form.id ? 'API Key (留空保留原值)' : 'API Key'} full><Input type='password' value={form.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder='sk-...' /></Field>
            <Field label="计价方式"><Select value={form.pricingMode} onValueChange={(v) => set({ pricingMode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRICING_MODES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="单价(积分)"><Input type="number" value={form.creditUnitPrice} onChange={(e) => set({ creditUnitPrice: Number(e.target.value) })} /></Field>
            <Field label="计价单位"><Input value={form.pricingUnit} onChange={(e) => set({ pricingUnit: e.target.value })} placeholder="call / 1k_tokens / second" /></Field>
            <Field label="优先级"><Input type="number" value={form.priority} onChange={(e) => set({ priority: Number(e.target.value) })} /></Field>
            <Field label="额外配置 config (JSON)" full><textarea value={form.config} onChange={(e) => set({ config: e.target.value })} placeholder='{"output_format":"jpeg","watermark":false}' className="min-h-20 w-full rounded-md border border-[var(--reelflow-hairline)] bg-transparent p-2 font-mono text-sm" /></Field>
            <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => set({ enabled: v })} /><Label>启用</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.isDefault} onCheckedChange={(v) => set({ isDefault: v })} /><Label>设为该分类默认</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? `sm:col-span-2` : ``}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

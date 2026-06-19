import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Archive, Download, Eye, FileText, ImageIcon, Loader2, RefreshCw, Search, Trash2, UploadCloud, WandSparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@libs/react-shared/ui/alert-dialog'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Input } from '@libs/react-shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'

export const Route = createFileRoute('/$lang/(root)/reelflow/assets')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.assets),
  component: ReelflowAssetsPage,
})

type AssetSourceFilter = 'all' | 'task' | 'personal'
type StorageProvider = 'oss' | 's3' | 'r2' | 'cos'

type ReelflowAsset = {
  id: string
  jobId: string | null
  templateName: string | null
  jobStatus: string | null
  assetType: string
  sourceType: string
  storageProvider: string | null
  storageKey: string | null
  url: string | null
  mimeType: string | null
  fileSize: number | null
  durationMs: number | null
  status: string
  visibility: string
  metadata: Record<string, unknown> | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

type AssetsResponse = {
  workspace: { id: string; name: string }
  assets: ReelflowAsset[]
}

const defaultUploadProvider: StorageProvider = 'r2'

const assetTypeOptions = [
  'all',
  'image',
  'reference_image',
  'logo',
  'avatar',
  'script',
  'storyboard',
  'audio',
  'caption',
  'draft_package',
  'workflow_project',
  'manifest',
  'rendered_mp4',
]

function ReelflowAssetsPage() {
  const { t, locale } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const loadSequenceRef = useRef(0)
  const [data, setData] = useState<AssetsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<AssetSourceFilter>('all')
  const [assetType, setAssetType] = useState('all')
  const [query, setQuery] = useState('')
  const [personalAssetType, setPersonalAssetType] = useState('reference_image')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<ReelflowAsset | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadAssets = async () => {
    const requestId = loadSequenceRef.current + 1
    loadSequenceRef.current = requestId
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('source', source)
      params.set('assetType', assetType)
      if (query.trim()) params.set('query', query.trim())
      const response = await fetch(`/api/reelflow/assets?${params.toString()}`)
      const payload = await response.json()
      if (requestId !== loadSequenceRef.current) return
      if (!response.ok) throw new Error(payload?.error || t.reelflow.assetLibrary.loadError)
      setData(payload)
    } catch (err) {
      if (requestId !== loadSequenceRef.current) return
      setError(err instanceof Error ? err.message : t.reelflow.assetLibrary.loadError)
    } finally {
      if (requestId === loadSequenceRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAssets(), query ? 250 : 0)
    return () => window.clearTimeout(timeout)
  }, [source, assetType, query])

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreview(null)
      return
    }

    const previewUrl = URL.createObjectURL(selectedFile)
    setSelectedFilePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [selectedFile])

  const counts = useMemo(() => {
    const assets = data?.assets || []
    return {
      all: assets.length,
      task: assets.filter((item) => item.sourceType === 'generated').length,
      personal: assets.filter((item) => item.sourceType === 'uploaded' || item.sourceType === 'ai_generated').length,
    }
  }, [data?.assets])

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatSize = (value: number | null) => {
    if (!value) return t.reelflow.common.unknown
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
    return `${(value / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDuration = (value: number | null) => {
    if (!value) return t.reelflow.common.unknown
    const seconds = Math.max(1, Math.round(value / 1000))
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const assetText = (type: string) => {
    if (type === 'all') return t.reelflow.assetLibrary.allTypes
    return (t.reelflow.assets as Record<string, string>)[type] || type
  }

  const sourceText = (value: string) => {
    if (value === 'generated') return t.reelflow.assetLibrary.sources.task
    if (value === 'uploaded') return t.reelflow.assetLibrary.sources.personal
    if (value === 'ai_generated') return t.reelflow.assetLibrary.sources.aiGenerated
    return value
  }

  const statusText = (value: string) => (t.reelflow.status as Record<string, string>)[value] || value

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t.reelflow.assetLibrary.errors.imageOnly)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.reelflow.assetLibrary.errors.fileTooLarge)
      return
    }
    setSelectedFile(file)
  }

  const uploadPersonalAsset = async () => {
    if (!selectedFile) {
      toast.error(t.reelflow.assetLibrary.errors.noFile)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('provider', defaultUploadProvider)

      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadPayload = await uploadResponse.json()
      if (!uploadResponse.ok || !uploadPayload.success) {
        throw new Error(uploadPayload?.error || uploadPayload?.message || t.reelflow.assetLibrary.uploadFailed)
      }

      const uploaded = uploadPayload.data
      const assetResponse = await fetch('/api/reelflow/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetType: personalAssetType,
          storageProvider: uploaded.provider,
          storageKey: uploaded.key,
          url: uploaded.url,
          mimeType: uploaded.contentType,
          fileSize: uploaded.size,
          originalName: uploaded.originalName,
          displayName: selectedFile.name,
        }),
      })
      const assetPayload = await assetResponse.json()
      if (!assetResponse.ok) throw new Error(assetPayload?.error || t.reelflow.assetLibrary.registerFailed)

      toast.success(t.reelflow.assetLibrary.uploadSuccess)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSource('personal')
      await loadAssets()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.assetLibrary.uploadFailed
      toast.error(t.reelflow.assetLibrary.uploadFailed, { description: message })
    } finally {
      setUploading(false)
    }
  }

  const removePersonalAsset = async (assetItem: ReelflowAsset) => {
    setDeletingAssetId(assetItem.id)
    try {
      const response = await fetch(`/api/reelflow/assets/${assetItem.id}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || t.reelflow.assetLibrary.removeFailed)

      toast.success(t.reelflow.assetLibrary.removeSuccess)
      if (selectedAsset?.id === assetItem.id) setSelectedAsset(null)
      await loadAssets()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.assetLibrary.removeFailed
      toast.error(t.reelflow.assetLibrary.removeFailed, { description: message })
    } finally {
      setDeletingAssetId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-assets-page">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Archive className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{data?.workspace.name || t.reelflow.common.productName}</p>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.reelflow.assetLibrary.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.assetLibrary.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadAssets} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.reelflow.common.refresh}
            </Button>
            <Button asChild>
              <a href={`/${locale}/reelflow`}>
                <WandSparkles className="mr-2 h-4 w-4" />
                {t.reelflow.common.createNew}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {(['all', 'task', 'personal'] as AssetSourceFilter[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-testid={`reelflow-assets-source-${item}`}
                    onClick={() => setSource(item)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      source === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.reelflow.assetLibrary.filters[item]} · {counts[item]}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-[180px_minmax(220px,1fr)]">
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger className="w-full" data-testid="reelflow-assets-type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypeOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {assetText(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="reelflow-assets-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t.reelflow.assetLibrary.searchPlaceholder}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t.reelflow.assetLibrary.loadError}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-lg border bg-muted/40" />
              ))}
            </div>
          ) : data?.assets.length === 0 ? (
            <section className="rounded-lg border border-dashed p-10 text-center" data-testid="reelflow-assets-empty">
              <Archive className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">{t.reelflow.assetLibrary.empty}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.reelflow.assetLibrary.emptyHint}</p>
            </section>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data?.assets.map((assetItem) => (
                <AssetCard
                  key={assetItem.id}
                  asset={assetItem}
                  assetText={assetText}
                  sourceText={sourceText}
                  statusText={statusText}
                  formatDate={formatDate}
                  formatSize={formatSize}
                  formatDuration={formatDuration}
                  locale={locale}
                  t={t}
                  deleting={deletingAssetId === assetItem.id}
                  onPreview={() => setSelectedAsset(assetItem)}
                  onDelete={() => removePersonalAsset(assetItem)}
                />
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t.reelflow.assetLibrary.uploadTitle}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.reelflow.assetLibrary.uploadDescription}</p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t.reelflow.assetLibrary.assetType}</p>
                <Select value={personalAssetType} onValueChange={setPersonalAssetType}>
                  <SelectTrigger className="w-full" data-testid="reelflow-asset-upload-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['reference_image', 'image', 'logo', 'avatar'].map((item) => (
                      <SelectItem key={item} value={item}>
                        {assetText(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                data-testid="reelflow-asset-upload-choose"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-40 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-6 text-center transition hover:border-primary/60 hover:bg-muted/30"
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <span className="mt-3 text-sm font-medium">{selectedFile ? selectedFile.name : t.reelflow.assetLibrary.chooseFile}</span>
                <span className="mt-1 text-xs text-muted-foreground">{t.reelflow.assetLibrary.fileHint}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                data-testid="reelflow-asset-upload-input"
                className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
              />

              {selectedFile && (
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-3">
                    {selectedFilePreview ? (
                      <img src={selectedFilePreview} alt={selectedFile.name} className="h-14 w-14 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button className="w-full" data-testid="reelflow-asset-upload-submit" onClick={uploadPersonalAsset} disabled={uploading || !selectedFile}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {uploading ? t.reelflow.assetLibrary.uploading : t.reelflow.assetLibrary.uploadAction}
              </Button>
            </div>
          </section>

          <Alert>
            <Archive className="h-4 w-4" />
            <AlertTitle>{t.reelflow.assetLibrary.scopeTitle}</AlertTitle>
            <AlertDescription>{t.reelflow.assetLibrary.scopeDescription}</AlertDescription>
          </Alert>
        </aside>
      </div>

      <AssetPreviewDialog
        asset={selectedAsset}
        assetText={assetText}
        sourceText={sourceText}
        statusText={statusText}
        formatDate={formatDate}
        formatSize={formatSize}
        formatDuration={formatDuration}
        locale={locale}
        t={t}
        deleting={selectedAsset ? deletingAssetId === selectedAsset.id : false}
        onOpenChange={(open) => {
          if (!open) setSelectedAsset(null)
        }}
        onDelete={selectedAsset ? () => removePersonalAsset(selectedAsset) : undefined}
      />
    </main>
  )
}

function AssetCard({
  asset,
  assetText,
  sourceText,
  statusText,
  formatDate,
  formatSize,
  formatDuration,
  locale,
  t,
  deleting,
  onPreview,
  onDelete,
}: {
  asset: ReelflowAsset
  assetText: (type: string) => string
  sourceText: (value: string) => string
  statusText: (value: string) => string
  formatDate: (value: string) => string
  formatSize: (value: number | null) => string
  formatDuration: (value: number | null) => string
  locale: string
  t: any
  deleting: boolean
  onPreview: () => void
  onDelete: () => void
}) {
  const isImage = Boolean(asset.url && asset.mimeType?.startsWith('image/'))
  const isAudio = Boolean(asset.url && asset.mimeType?.startsWith('audio/'))
  const displayName = typeof asset.metadata?.displayName === 'string'
    ? asset.metadata.displayName
    : asset.templateName || `${assetText(asset.assetType)} · ${formatDate(asset.createdAt)}`
  const canDelete = asset.sourceType === 'uploaded' || asset.sourceType === 'ai_generated'

  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm" data-testid={`reelflow-asset-card-${asset.assetType}`}>
      <div className="flex aspect-video items-center justify-center bg-muted/40">
        {isImage ? (
          <img src={asset.url!} alt={displayName} className="h-full w-full object-cover" />
        ) : isAudio ? (
          <div className="flex flex-col items-center gap-3 px-4 text-muted-foreground">
            <FileText className="h-10 w-10" />
            <span className="text-sm">{assetText(asset.assetType)}</span>
            <audio controls src={asset.url!} className="w-full max-w-[220px]" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {asset.assetType === 'draft_package' ? <Archive className="h-10 w-10" /> : asset.assetType === 'image' ? <ImageIcon className="h-10 w-10" /> : <FileText className="h-10 w-10" />}
            <span className="text-sm">{assetText(asset.assetType)}</span>
          </div>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{sourceText(asset.sourceType)}</Badge>
            <Badge variant={asset.status === 'available' ? 'default' : 'outline'}>{statusText(asset.status)}</Badge>
          </div>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold">{displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{assetText(asset.assetType)}</p>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          <Info label={t.reelflow.assetLibrary.createdAt} value={formatDate(asset.createdAt)} />
          <Info label={t.reelflow.assetLibrary.fileSize} value={formatSize(asset.fileSize)} />
          {asset.durationMs ? <Info label={t.reelflow.assetLibrary.duration} value={formatDuration(asset.durationMs)} /> : null}
          {asset.templateName && <Info label={t.reelflow.assetLibrary.template} value={asset.templateName} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onPreview} data-testid={`reelflow-asset-preview-${asset.assetType}`}>
            <Eye className="mr-2 h-4 w-4" />
            {t.reelflow.assetLibrary.preview}
          </Button>
          {asset.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={asset.url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                {t.reelflow.assetLibrary.openAsset}
              </a>
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={deleting} data-testid={`reelflow-asset-delete-${asset.assetType}`}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {t.actions.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.reelflow.assetLibrary.removeTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.reelflow.assetLibrary.removeDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} data-testid={`reelflow-asset-confirm-delete-${asset.assetType}`}>{t.actions.delete}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {asset.jobId && (
            <Button variant="ghost" size="sm" asChild>
              <a href={`/${locale}/reelflow/jobs/${asset.jobId}`} data-testid={`reelflow-asset-open-job-${asset.assetType}`}>
                {t.reelflow.assetLibrary.openJob}
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function AssetPreviewDialog({
  asset,
  assetText,
  sourceText,
  statusText,
  formatDate,
  formatSize,
  formatDuration,
  locale,
  t,
  deleting,
  onOpenChange,
  onDelete,
}: {
  asset: ReelflowAsset | null
  assetText: (type: string) => string
  sourceText: (value: string) => string
  statusText: (value: string) => string
  formatDate: (value: string) => string
  formatSize: (value: number | null) => string
  formatDuration: (value: number | null) => string
  locale: string
  t: any
  deleting: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}) {
  if (!asset) return null

  const displayTitle = typeof asset.metadata?.displayName === 'string'
    ? asset.metadata.displayName
    : asset.templateName || `${assetText(asset.assetType)} · ${formatDate(asset.createdAt)}`
  const isImage = Boolean(asset.url && asset.mimeType?.startsWith('image/'))
  const isAudio = Boolean(asset.url && asset.mimeType?.startsWith('audio/'))
  const canDelete = (asset.sourceType === 'uploaded' || asset.sourceType === 'ai_generated') && onDelete

  return (
    <Dialog open={!!asset} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="reelflow-asset-library-preview-dialog">
        <DialogHeader>
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>{t.reelflow.assetLibrary.previewDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            {isImage ? (
              <img src={asset.url!} alt={displayTitle} className="max-h-[58vh] w-full object-contain" />
            ) : isAudio ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-muted-foreground">
                <FileText className="h-12 w-12" />
                <span className="text-sm">{assetText(asset.assetType)}</span>
                <audio controls src={asset.url!} className="w-full max-w-md" />
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                {asset.assetType === 'draft_package' ? <Archive className="h-12 w-12" /> : <FileText className="h-12 w-12" />}
                <span className="text-sm">{assetText(asset.assetType)}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{sourceText(asset.sourceType)}</Badge>
              <Badge variant={asset.status === 'available' ? 'default' : 'outline'}>{statusText(asset.status)}</Badge>
            </div>

            <div className="grid gap-2 text-sm">
              <Info label={t.reelflow.assetLibrary.assetType} value={assetText(asset.assetType)} />
              <Info label={t.reelflow.assetLibrary.createdAt} value={formatDate(asset.createdAt)} />
              <Info label={t.reelflow.assetLibrary.fileSize} value={formatSize(asset.fileSize)} />
              {asset.durationMs ? <Info label={t.reelflow.assetLibrary.duration} value={formatDuration(asset.durationMs)} /> : null}
              {asset.templateName && <Info label={t.reelflow.assetLibrary.template} value={asset.templateName} />}
              {asset.jobStatus && <Info label={t.reelflow.assetLibrary.jobStatus} value={statusText(asset.jobStatus)} />}
            </div>

            <div className="flex flex-wrap gap-2">
              {asset.url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={asset.url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {t.reelflow.assetLibrary.openAsset}
                  </a>
                </Button>
              )}
              {asset.jobId && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/${locale}/reelflow/jobs/${asset.jobId}`}>
                    {t.reelflow.assetLibrary.openJob}
                  </a>
                </Button>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting} data-testid={`reelflow-asset-dialog-delete-${asset.assetType}`}>
                      {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      {t.actions.delete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.reelflow.assetLibrary.removeTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{t.reelflow.assetLibrary.removeDescription}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} data-testid={`reelflow-asset-dialog-confirm-delete-${asset.assetType}`}>{t.actions.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">{value}</span>
    </div>
  )
}

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Archive, Download, Eye, FileText, ImageIcon, Loader2, RefreshCw, Search, Trash2, UploadCloud, WandSparkles, type LucideIcon } from 'lucide-react'
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
import { Button } from '@libs/react-shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Input } from '@libs/react-shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { EmptyState, PageHeader, TonePill } from '@/components/reelflow-ui'

type AssetSourceFilter = 'all' | 'task' | 'personal'
type StorageProvider = 'oss' | 's3' | 'r2' | 'cos'

const assetSourceOptions: AssetSourceFilter[] = ['all', 'task', 'personal']

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

export const Route = createFileRoute('/$lang/(root)/reelflow/assets')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  validateSearch: (search: Record<string, unknown>) => {
    const source = assetSourceOptions.includes(search.source as AssetSourceFilter)
      ? (search.source as AssetSourceFilter)
      : 'all'
    const assetType = typeof search.assetType === 'string' && assetTypeOptions.includes(search.assetType)
      ? search.assetType
      : 'all'

    return {
      query: typeof search.query === 'string' ? search.query : '',
      source,
      assetType,
    }
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.assets),
  component: ReelflowAssetsPage,
})

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

function ReelflowAssetsPage() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const { query: routeQuery, source: routeSource, assetType: routeAssetType } = Route.useSearch()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const loadSequenceRef = useRef(0)
  const [data, setData] = useState<AssetsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<AssetSourceFilter>(routeSource)
  const [assetType, setAssetType] = useState(routeAssetType)
  const [query, setQuery] = useState(routeQuery)
  const [personalAssetType, setPersonalAssetType] = useState('reference_image')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<ReelflowAsset | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const updateFilters = (next: Partial<{ source: AssetSourceFilter; assetType: string; query: string }>) => {
    const nextSource = next.source ?? source
    const nextAssetType = next.assetType ?? assetType
    const nextQuery = next.query ?? query

    setSource(nextSource)
    setAssetType(nextAssetType)
    setQuery(nextQuery)
    void navigate({
      to: '/$lang/reelflow/assets',
      params: { lang: locale },
      search: { source: nextSource, assetType: nextAssetType, query: nextQuery },
      replace: true,
    })
  }

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
    setSource(routeSource)
    setAssetType(routeAssetType)
    setQuery(routeQuery)
  }, [routeSource, routeAssetType, routeQuery])

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
    return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  const formatSize = (value: number | null) => {
    if (!value) return t.reelflow.common.unknown
    const formatter = new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      maximumFractionDigits: value < 1024 * 1024 ? 0 : 1,
    })
    if (value < 1024 * 1024) return `${formatter.format(value / 1024)} KB`
    return `${formatter.format(value / 1024 / 1024)} MB`
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
      setUploadDialogOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      updateFilters({ source: 'personal' })
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
    <main className="min-h-screen" data-testid="reelflow-assets-page">
      <section className="px-4 pt-8 pb-2 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <PageHeader
            eyebrow={t.reelflow.shell.workspaceName}
            title={t.reelflow.assetLibrary.title}
            description={t.reelflow.assetLibrary.description}
            actions={(
              <>
                <Button type="button" variant="outline" onClick={loadAssets} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {t.reelflow.common.refresh}
                </Button>
                <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(true)} data-testid="reelflow-asset-upload-open">
                  <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.assetLibrary.uploadTitle}
                </Button>
                <Button asChild>
                  <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
                    <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.common.createNew}
                  </Link>
                </Button>
              </>
            )}
          />
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <section className="reelflow-panel p-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] xl:items-start">
              <div className="grid gap-3 md:grid-cols-3">
                {assetSourceOptions.map((item) => (
                  <SourceFilterCard
                    key={item}
                    source={item}
                    active={source === item}
                    label={t.reelflow.assetLibrary.filters[item]}
                    count={counts[item]}
                    onClick={() => updateFilters({ source: item })}
                  />
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-[180px_minmax(220px,1fr)]">
                <Select name="reelflow-assets-type-filter" value={assetType} onValueChange={(value) => updateFilters({ assetType: value })}>
                  <SelectTrigger
                    id="reelflow-assets-type-filter"
                    aria-label={t.reelflow.assetLibrary.assetType}
                    className="w-full"
                    data-testid="reelflow-assets-type-filter"
                  >
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
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label={t.reelflow.assetLibrary.searchPlaceholder}
                    name="reelflow-assets-search"
                    autoComplete="off"
                    data-testid="reelflow-assets-search"
                    value={query}
                    onChange={(event) => updateFilters({ query: event.target.value })}
                    placeholder={t.reelflow.assetLibrary.searchPlaceholder}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3 rounded-lg bg-muted/35 px-3 py-3 text-sm text-muted-foreground">
              <Archive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t.reelflow.assetLibrary.scopeTitle}</p>
                <p className="mt-1 leading-6">{t.reelflow.assetLibrary.scopeDescription}</p>
              </div>
            </div>
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t.reelflow.assetLibrary.loadError}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : data?.assets.length === 0 ? (
            <section data-testid="reelflow-assets-empty">
              <EmptyState
                icon={Archive}
                title={t.reelflow.assetLibrary.empty}
                description={t.reelflow.assetLibrary.emptyHint}
              />
            </section>
          ) : (
            <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open)
          if (!open && !uploading) {
            setSelectedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="reelflow-asset-upload-dialog">
          <DialogHeader>
            <DialogTitle>{t.reelflow.assetLibrary.uploadTitle}</DialogTitle>
            <DialogDescription>{t.reelflow.assetLibrary.uploadDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reelflow-asset-upload-type" className="text-sm font-medium">{t.reelflow.assetLibrary.assetType}</label>
              <Select name="reelflow-asset-upload-type" value={personalAssetType} onValueChange={setPersonalAssetType}>
                <SelectTrigger
                  id="reelflow-asset-upload-type"
                  aria-label={t.reelflow.assetLibrary.assetType}
                  className="w-full"
                  data-testid="reelflow-asset-upload-type"
                >
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
              className="flex min-h-40 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/45 bg-background/55 px-4 py-6 text-center transition-colors hover:border-primary/45 hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <span className="mt-3 text-sm font-medium">{selectedFile ? selectedFile.name : t.reelflow.assetLibrary.chooseFile}</span>
              <span className="mt-1 text-xs text-muted-foreground">{t.reelflow.assetLibrary.fileHint}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              name="reelflow-asset-upload-file"
              accept="image/*"
              aria-label={t.reelflow.assetLibrary.chooseFile}
              data-testid="reelflow-asset-upload-input"
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />

            {selectedFile && (
              <div className="reelflow-muted-tile p-3">
                <div className="flex items-center gap-3">
                  {selectedFilePreview ? (
                    <img src={selectedFilePreview} alt={selectedFile.name} width={56} height={56} className="h-14 w-14 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              className="w-full disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
              variant={selectedFile ? 'default' : 'outline'}
              data-testid="reelflow-asset-upload-submit"
              onClick={uploadPersonalAsset}
              disabled={uploading || !selectedFile}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />}
              {uploading ? t.reelflow.assetLibrary.uploading : t.reelflow.assetLibrary.uploadAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function SourceFilterCard({
  source,
  active,
  label,
  count,
  onClick,
}: {
  source: AssetSourceFilter
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  const Icon: LucideIcon = source === 'task' ? Archive : source === 'personal' ? UploadCloud : WandSparkles
  return (
    <button
      type="button"
      data-testid={`reelflow-assets-source-${source}`}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'reelflow-muted-tile group min-w-0 px-4 py-3 text-left transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active ? 'shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--reelflow-coral)_42%,transparent),0_14px_34px_-30px_var(--reelflow-coral)]' : '',
      ].join(' ')}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-muted-foreground ring-1 ring-border/45'].join(' ')}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-medium">{label}</span>
        </span>
        <span className="reelflow-display reelflow-num text-xl">{count}</span>
      </span>
    </button>
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
    <article className="reelflow-soft-tile flex h-full min-h-[380px] flex-col overflow-hidden" data-testid={`reelflow-asset-card-${asset.assetType}`}>
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-muted/35">
        {isImage ? (
          <img src={asset.url!} alt={displayName} width={1024} height={576} loading="lazy" className="h-full w-full object-cover" />
        ) : isAudio ? (
          <div className="flex flex-col items-center gap-3 px-4 text-muted-foreground">
            <FileText className="h-10 w-10" aria-hidden="true" />
            <span className="text-sm">{assetText(asset.assetType)}</span>
            <audio controls src={asset.url!} className="w-full max-w-[220px]" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {asset.assetType === 'draft_package' ? <Archive className="h-10 w-10" aria-hidden="true" /> : asset.assetType === 'image' ? <ImageIcon className="h-10 w-10" aria-hidden="true" /> : <FileText className="h-10 w-10" aria-hidden="true" />}
            <span className="text-sm">{assetText(asset.assetType)}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          <TonePill tone="neutral">{sourceText(asset.sourceType)}</TonePill>
          <TonePill tone={asset.status === 'available' ? 'success' : 'neutral'}>{statusText(asset.status)}</TonePill>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold">{displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{assetText(asset.assetType)}</p>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <Info label={t.reelflow.assetLibrary.createdAt} value={formatDate(asset.createdAt)} />
          <Info label={t.reelflow.assetLibrary.fileSize} value={formatSize(asset.fileSize)} />
          {asset.durationMs ? <Info label={t.reelflow.assetLibrary.duration} value={formatDuration(asset.durationMs)} /> : null}
          {asset.templateName && <Info label={t.reelflow.assetLibrary.template} value={asset.templateName} />}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onPreview} data-testid={`reelflow-asset-preview-${asset.assetType}`}>
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            {t.reelflow.assetLibrary.preview}
          </Button>
          {asset.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={asset.url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                {t.reelflow.assetLibrary.openAsset}
              </a>
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" disabled={deleting} data-testid={`reelflow-asset-delete-${asset.assetType}`}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />}
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
              <Link to="/$lang/reelflow/jobs/$id" params={{ lang: locale, id: asset.jobId }} data-testid={`reelflow-asset-open-job-${asset.assetType}`}>
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                {t.reelflow.assetLibrary.openJob}
              </Link>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain sm:max-w-3xl" data-testid="reelflow-asset-library-preview-dialog">
        <DialogHeader>
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>{t.reelflow.assetLibrary.previewDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/35">
            {isImage ? (
              <img src={asset.url!} alt={displayTitle} width={1024} height={576} className="max-h-[58vh] w-full object-contain" />
            ) : isAudio ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-muted-foreground">
                <FileText className="h-12 w-12" aria-hidden="true" />
                <span className="text-sm">{assetText(asset.assetType)}</span>
                <audio controls src={asset.url!} className="w-full max-w-md" />
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                {asset.assetType === 'draft_package' ? <Archive className="h-12 w-12" aria-hidden="true" /> : <FileText className="h-12 w-12" aria-hidden="true" />}
                <span className="text-sm">{assetText(asset.assetType)}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <TonePill tone="neutral">{sourceText(asset.sourceType)}</TonePill>
              <TonePill tone={asset.status === 'available' ? 'success' : 'neutral'}>{statusText(asset.status)}</TonePill>
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
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.assetLibrary.openAsset}
                  </a>
                </Button>
              )}
              {asset.jobId && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/$lang/reelflow/jobs/$id" params={{ lang: locale, id: asset.jobId }}>
                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.assetLibrary.openJob}
                  </Link>
                </Button>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm" disabled={deleting} data-testid={`reelflow-asset-dialog-delete-${asset.assetType}`}>
                      {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />}
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

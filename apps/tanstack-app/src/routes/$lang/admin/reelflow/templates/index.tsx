import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import { Loader2, Pencil, Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/reelflow-ui'
import { useTranslation } from '@/hooks/use-translation'

export const Route = createFileRoute('/$lang/admin/reelflow/templates/')({
  head: ({ params }) => seoHead(params.lang, () => ({ title: '模板管理', description: '视频模板维护与上架' })),
  component: TemplatesAdminPage,
})

type TemplateRow = {
  code: string
  name: string
  category: string
  version: string
  fields: number
  outputs: number
  source: 'builtin' | 'dynamic'
  status: string
  visibility: string | null
  dbVersion: string | null
}

const STATUS_LABEL: Record<string, string> = { published: '已上架', draft: '草稿', archived: '已下架', unpublished: '未上架' }

function TemplatesAdminPage() {
  const { locale } = useTranslation()
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reelflow/templates')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '加载失败')
      setTemplates(data.templates || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="模板管理"
        description="维护视频模板：手动新建、代码编辑、调试试运行、保存与上架发布。"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1 h-4 w-4" />刷新</Button>
            <Button size="sm" asChild>
              <Link to="/$lang/admin/reelflow/templates/$code" params={{ lang: locale, code: 'new' }}>
                <Plus className="mr-1 h-4 w-4" />新建模板
              </Link>
            </Button>
          </div>
        }
      />

      <div className="reelflow-panel overflow-hidden p-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无模板，点击「新建模板」创建。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称 / Code</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>字段 / 产物</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.code}>
                  <TableCell><div className="font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.code}</div></TableCell>
                  <TableCell><Badge variant={t.source === 'dynamic' ? 'default' : 'outline'}>{t.source === 'dynamic' ? '动态' : '内置'}</Badge></TableCell>
                  <TableCell className="text-sm">{t.category}</TableCell>
                  <TableCell className="reelflow-num text-sm">{t.version}</TableCell>
                  <TableCell className="reelflow-num text-sm">{t.fields} / {t.outputs}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'published' ? 'default' : 'outline'}>{STATUS_LABEL[t.status] || t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/$lang/admin/reelflow/templates/$code" params={{ lang: locale, code: t.code }}>
                        <Pencil className="mr-1 h-4 w-4" />{t.source === 'dynamic' ? '编辑' : '查看'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

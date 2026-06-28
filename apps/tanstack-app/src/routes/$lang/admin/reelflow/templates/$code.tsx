import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/reelflow-ui'
import { useTranslation } from '@/hooks/use-translation'

export const Route = createFileRoute('/$lang/admin/reelflow/templates/$code')({
  head: ({ params }) => seoHead(params.lang, () => ({ title: '模板编辑器', description: '视频模板代码编辑与调试' })),
  component: TemplateEditorPage,
})

function TemplateEditorPage() {
  const { code } = Route.useParams()
  const { locale } = useTranslation()
  const isNew = code === 'new'

  return (
    <div className="space-y-6">
      <Link to="/$lang/admin/reelflow/templates" params={{ lang: locale }} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />返回模板列表
      </Link>
      <PageHeader title={isNew ? '新建模板' : `编辑模板 · ${code}`} description="代码编辑器 + 调试试运行 + 上架发布（开发中）。" />
      <div className="reelflow-panel p-6">
        <p className="text-sm text-muted-foreground">模板代码编辑器即将上线（Monaco + 试运行 + 上架）。</p>
      </div>
    </div>
  )
}

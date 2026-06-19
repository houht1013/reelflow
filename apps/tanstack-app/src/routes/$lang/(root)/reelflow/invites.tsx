import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check, Coins, Copy, Gift, Loader2, RefreshCw, Users } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'

export const Route = createFileRoute('/$lang/(root)/reelflow/invites')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.invites),
  component: ReelflowInvitesPage,
})

type InviteRecord = {
  id: string
  status: string
  referrerBonusCredits: number
  referredBonusCredits: number
  createdAt: string
  rewardedAt: string | null
  referredUserName: string | null
  referredUserEmail: string | null
}

type InviteDashboard = {
  code: string
  inviteUrl: string
  bonuses: {
    referrer: number
    referred: number
    totalEarned: number
    successfulInvites: number
  }
  records: InviteRecord[]
}

function ReelflowInvitesPage() {
  const { t, locale } = useTranslation()
  const [data, setData] = useState<InviteDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadInvites = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/reelflow/invites?locale=${encodeURIComponent(locale)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || t.reelflow.invites.loadError)
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reelflow.invites.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvites()
  }, [locale])

  const formatCredits = (value: number) =>
    new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }).format(value)

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const copyInviteUrl = async () => {
    if (!data?.inviteUrl) return
    await navigator.clipboard.writeText(data.inviteUrl)
    setCopied(true)
    toast.success(t.reelflow.invites.copied)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-invites-page">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Gift className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t.reelflow.common.productName}</p>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.reelflow.invites.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.invites.description}</p>
          </div>
          <Button variant="outline" onClick={loadInvites} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t.reelflow.common.refresh}
          </Button>
        </div>
      </section>

      <div className="container mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.reelflow.invites.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex h-56 items-center justify-center rounded-lg border">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <InviteMetric testId="reelflow-invite-referrer-reward" icon={<Coins className="h-4 w-4" />} label={t.reelflow.invites.referrerReward} value={`${formatCredits(data.bonuses.referrer)} ${t.reelflow.common.credits}`} />
              <InviteMetric testId="reelflow-invite-referred-reward" icon={<Gift className="h-4 w-4" />} label={t.reelflow.invites.referredReward} value={`${formatCredits(data.bonuses.referred)} ${t.reelflow.common.credits}`} />
              <InviteMetric testId="reelflow-invite-successful-count" icon={<Users className="h-4 w-4" />} label={t.reelflow.invites.successfulInvites} value={String(data.bonuses.successfulInvites)} detail={`${formatCredits(data.bonuses.totalEarned)} ${t.reelflow.invites.totalEarned}`} />
            </section>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">{t.reelflow.invites.shareTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.invites.shareDescription}</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="reelflow-invite-url">
                    {t.reelflow.invites.inviteLink}
                  </label>
                  <Input id="reelflow-invite-url" value={data.inviteUrl} readOnly className="font-mono text-sm" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full lg:w-auto" onClick={copyInviteUrl} data-testid="reelflow-copy-invite">
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? t.reelflow.invites.copiedShort : t.reelflow.invites.copyLink}
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" data-testid="reelflow-invite-code">{t.reelflow.invites.inviteCode}: {data.code}</Badge>
                <Badge variant="outline">{t.reelflow.invites.autoCredit}</Badge>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border bg-card shadow-sm" data-testid="reelflow-invite-records">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">{t.reelflow.invites.recordsTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.invites.recordsDescription}</p>
              </div>
              {data.records.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t.reelflow.invites.emptyRecords}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.reelflow.invites.table.user}</TableHead>
                        <TableHead>{t.reelflow.invites.table.status}</TableHead>
                        <TableHead>{t.reelflow.invites.table.reward}</TableHead>
                        <TableHead>{t.reelflow.invites.table.time}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.records.map((record) => (
                        <TableRow key={record.id} data-testid={`reelflow-invite-record-${record.id}`}>
                          <TableCell>
                            <div className="min-w-48">
                              <p className="font-medium">{record.referredUserName || t.reelflow.invites.unnamedUser}</p>
                              <p className="text-xs text-muted-foreground">{record.referredUserEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'rewarded' ? 'default' : 'secondary'}>
                              {(t.reelflow.invites.status as Record<string, string>)[record.status] || record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>+{formatCredits(record.referrerBonusCredits)} {t.reelflow.common.credits}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(record.rewardedAt || record.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

function InviteMetric({
  testId,
  icon,
  label,
  value,
  detail,
}: {
  testId?: string
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm" data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </section>
  )
}

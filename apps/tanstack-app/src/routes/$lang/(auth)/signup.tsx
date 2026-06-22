import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { SocialAuth } from '@/components/social-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@libs/react-shared/ui/card'
import { useTranslation } from '@/hooks/use-translation'

export const Route = createFileRoute('/$lang/(auth)/signup')({
  head: ({ params }) => seoHead(params.lang, (t) => t.auth.metadata.signup),
  component: SignupPage,
})

function SignupPage() {
  const { t, locale } = useTranslation()

  return (
    <Card className="reelflow-panel w-full gap-5 border-transparent py-6 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="reelflow-display text-xl">
          {t.auth.signup.createAccount}
        </CardTitle>
        <CardDescription>{t.auth.signup.socialSignup}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SocialAuth />
        <div className="reelflow-muted-tile px-4 py-3 text-center text-sm leading-6 text-muted-foreground">
          {t.auth.signup.haveAccount}{' '}
          <Link
            to="/$lang/signin"
            params={{ lang: locale }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.auth.signup.signinLink}
          </Link>
        </div>
        <div className="text-muted-foreground text-balance text-center text-xs leading-5">
          {t.auth.signup.termsNotice}{' '}
          <span className="font-medium text-foreground">{t.auth.signup.termsOfService}</span>{' '}
          {t.common.and}{' '}
          <span className="font-medium text-foreground">{t.auth.signup.privacyPolicy}</span>.
        </div>
      </CardContent>
    </Card>
  )
}

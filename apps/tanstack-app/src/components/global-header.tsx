import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@libs/react-shared/ui/button";
import { authClientReact } from "@libs/auth/authClient";
import { ArrowRight, Menu, X } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { BrandMark } from "@/components/brand-mark";
import { toast } from "sonner";
import { cn } from "@libs/ui/utils/cn";

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [claimingInviteCode, setClaimingInviteCode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale: currentLocale } = useTranslation();
  const isLandingPage = location.pathname === `/${currentLocale}` || location.pathname === `/${currentLocale}/`;
  // Focused flows (checkout) use a stripped header: logo + night-mode toggle only.
  const isMinimal = /\/checkout(\/|$)/.test(location.pathname);

  const {
    data: session,
    isPending
  } = authClientReact.useSession();
  const user = session?.user;

  useEffect(() => {
    if (!user || claimingInviteCode || typeof window === "undefined") return;

    const pendingInviteCode = window.localStorage.getItem("reelflow.pendingInviteCode");
    if (!pendingInviteCode) return;

    setClaimingInviteCode(true);
    fetch("/api/reelflow/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: pendingInviteCode }),
    })
      .then((response) => response.json())
      .then((payload) => {
        if (["rewarded", "already_claimed", "self_invite", "invalid_code"].includes(payload.status)) {
          window.localStorage.removeItem("reelflow.pendingInviteCode");
        }
        if (payload.status === "rewarded") {
          toast.success(t.reelflow.invites.claimed, {
            description: t.reelflow.invites.claimedDescription,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to claim pending Reelflow invite:", error);
      })
      .finally(() => setClaimingInviteCode(false));
  }, [claimingInviteCode, t.reelflow.invites.claimed, t.reelflow.invites.claimedDescription, user]);

  const handleSignOut = async () => {
    await authClientReact.signOut();
    navigate({ to: `/${currentLocale}` });
  };

  const navItems: { href: string; label: string; newTab?: boolean }[] = [
    { href: `/${currentLocale}#product`, label: t.header.navigation.product },
    { href: `/${currentLocale}#workflow`, label: t.header.navigation.workflow },
    { href: `/${currentLocale}/pricing`, label: t.header.navigation.pricing, newTab: true },
    { href: `/${currentLocale}#docs`, label: t.header.navigation.docs },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b backdrop-blur-xl",
        isLandingPage
          ? "border-white/[0.08] bg-[#07080c] text-white supports-[backdrop-filter]:bg-[#07080c]/85"
          : "border-border bg-background/90 text-foreground",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/$lang" params={{ lang: currentLocale }} className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" variant={isLandingPage ? 'dark' : 'auto'} fallbackIconClassName="h-5 w-5" />
            <span className="text-xl font-semibold tracking-normal">Reelflow</span>
          </Link>

          {!isMinimal && (
            <nav className="hidden items-center gap-7 md:flex">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.newTab ? "_blank" : undefined}
                  rel={item.newTab ? "noopener noreferrer" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isLandingPage ? "text-white/58 hover:text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          <div className={cn("items-center gap-3", isMinimal ? "flex" : "hidden md:flex")}>
            {isMinimal ? null : isPending ? (
              <div className="h-8 w-24 rounded-full bg-white/10" />
            ) : user ? (
              <Button asChild className="rounded-full bg-[#ff6045] px-4 text-white shadow-[0_16px_36px_-24px_#ff6045] hover:bg-[#ff735b]">
                <Link to="/$lang/reelflow" params={{ lang: currentLocale }}>
                  {t.header.navigation.workbench}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Link to="/$lang/signin" params={{ lang: currentLocale }}>
                  <Button variant="ghost" className={cn("text-sm font-medium", isLandingPage && "text-white hover:bg-white/10 hover:text-white")}>
                    {t.header.auth.signIn}
                  </Button>
                </Link>
                <Link to="/$lang/signup" params={{ lang: currentLocale }}>
                  <Button className="rounded-full bg-[#ff6045] text-sm font-medium text-white shadow-[0_16px_36px_-24px_#ff6045] hover:bg-[#ff735b]">
                    {t.header.auth.getStarted}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {!isMinimal && (
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className={cn(
                "inline-flex items-center justify-center rounded-md p-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden",
                isLandingPage ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="sr-only">{t.reelflow.shell.openMenu}</span>
              {isMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {!isMinimal && isMenuOpen && (
        <div className={cn("border-t md:hidden", isLandingPage ? "border-white/[0.08] bg-[#07080c]" : "border-border bg-background")}>
          <div className="mx-auto max-w-6xl space-y-2 px-5 py-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noopener noreferrer" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-base font-medium",
                  isLandingPage ? "text-white/76 hover:bg-white/10 hover:text-white" : "text-foreground hover:bg-muted"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className={cn("my-3 border-t", isLandingPage ? "border-white/[0.08]" : "border-border")} />
            {user ? (
              <div className="grid gap-2 pt-2">
                <Link to="/$lang/reelflow" params={{ lang: currentLocale }} onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full rounded-full bg-[#ff6045] text-white hover:bg-[#ff735b]">
                    {t.header.navigation.workbench}
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg px-3 py-2 text-left text-base font-medium text-destructive hover:bg-destructive/10"
                >
                  {t.header.auth.signOut}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link to="/$lang/signin" params={{ lang: currentLocale }} onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full">
                    {t.header.auth.signIn}
                  </Button>
                </Link>
                <Link to="/$lang/signup" params={{ lang: currentLocale }} onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full rounded-full bg-[#ff6045] text-white hover:bg-[#ff735b]">
                    {t.header.auth.getStarted}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}


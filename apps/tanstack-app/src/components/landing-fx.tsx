import { useEffect } from 'react'
import { Mail, MessageCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { BrandMark } from '@/components/brand-mark'

/**
 * Reveals every [data-reveal] element as it scrolls into view. SSR-safe:
 * elements are only hidden once JS marks the root `reveal-ready`, so the
 * content stays visible without JavaScript.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector<HTMLElement>('.reelflow-landing')
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    root.classList.add('reveal-ready')

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/**
 * Scroll-driven flourishes: a top reading-progress bar and a subtle background
 * parallax on the hero. rAF-throttled and disabled under reduced-motion.
 */
export function useScrollFX(
  progressRef: React.RefObject<HTMLDivElement | null>,
  heroRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      const docH = document.documentElement.scrollHeight - window.innerHeight
      const p = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
      if (!reduce && heroRef.current) heroRef.current.style.setProperty('--sy', String(y))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [progressRef, heroRef])
}

/**
 * The cinematic dark backdrop shared by marketing pages: drifting aurora glows,
 * a faint grid, and (optionally) the perspective floor + cursor spotlight used
 * on the landing hero.
 */
export function LandingAtmosphere({
  floor = false,
  spotlight = false,
}: {
  floor?: boolean
  spotlight?: boolean
}) {
  return (
    <div className="landing-hero-bg pointer-events-none absolute inset-0 overflow-hidden">
      <div className="landing-grid" />
      {floor && <div className="landing-floor" />}
      <div className="landing-glow landing-glow-c" />
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />
      {spotlight && <div className="landing-spotlight" />}
    </div>
  )
}

function FooterColumn({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <a href={item.href} className="text-sm text-white/50 transition-colors hover:text-white">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shared marketing footer (brand, social, quick links, legal). */
export function LandingFooter() {
  const { t, locale } = useTranslation()
  const footer = t.reelflow.landing.footer

  return (
    <footer className="relative border-t border-white/[0.08] bg-[#07080c]">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <a href={`/${locale}`} className="flex items-center gap-2.5">
              <BrandMark className="h-9 w-9" variant="dark" fallbackIconClassName="h-5 w-5" />
              <span className="text-lg font-semibold text-white">Reelflow</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/50">{footer.tagline}</p>
            <div className="mt-5 flex items-center gap-2.5">
              <a href="#" aria-label="X" className="landing-footer-social">
                <span className="text-sm font-semibold">X</span>
              </a>
              <a href="#" aria-label={footer.contact} className="landing-footer-social">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="mailto:hello@reelflow.app" aria-label="Email" className="landing-footer-social">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <FooterColumn
            title={footer.productTitle}
            items={[
              { label: footer.product, href: `/${locale}#product` },
              { label: footer.workflow, href: `/${locale}#workflow` },
              { label: footer.cases, href: `/${locale}#cases` },
              { label: footer.pricing, href: `/${locale}/pricing` },
            ]}
          />
          <FooterColumn
            title={footer.resourcesTitle}
            items={[
              { label: footer.docs, href: `/${locale}#docs` },
              { label: footer.contact, href: 'mailto:hello@reelflow.app' },
            ]}
          />
          <FooterColumn
            title={footer.legalTitle}
            items={[
              { label: footer.privacy, href: '#' },
              { label: footer.terms, href: '#' },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-6">
          <p className="text-xs text-white/40">{footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

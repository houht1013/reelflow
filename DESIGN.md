# Reelflow Design Language

A minimal, monochrome system — **white / gray (#F7F7F7) / black**. Calm, restrained,
content-first. Inspiration: youmind.com, x.ai. Color is used only to carry meaning
(status / credits), never for decoration.

Tokens live in `apps/tanstack-app/src/styles.css` (`:root` light, `.dark .reelflow-app`
dark). Components consume CSS variables + the `reelflow-*` utility classes — **never
hardcode colors in components**; change a token and the whole app re-skins.

---

## 1. Color

### Neutrals (the system)
| Token | Light | Use |
|---|---|---|
| `--background` | `#ffffff` (oklch 1 0 0) | page canvas |
| `--card` | `#ffffff` | panels, cards, inputs |
| `--muted` / `--secondary` | `#f7f7f7` (oklch 0.973 0 0) | secondary surfaces, tiles, hover fills |
| `--foreground` | near-black (oklch 0.205 0 0) | primary text |
| `--muted-foreground` | mid-gray (oklch 0.52 0 0) | secondary text, captions |
| `--primary` | near-black | primary buttons, active states |
| `--primary-foreground` | white | text on primary |
| `--border` | `#e6e6e6` (oklch 0.91 0 0) | hairlines, dividers, card borders |
| `--ring` | near-black | focus ring |

Dark mode mirrors this neutrally: near-black canvas, white text, **near-white primary**
(white buttons on dark), neutral borders. No hue.

### Accents — meaning only
Decorative accents are **neutralized to grayscale** (`--reelflow-coral` = black brand,
`--reelflow-blue` / `--reelflow-violet` = gray). The only hues that survive are
functional and **muted**:
- `--reelflow-green` — success / completed (oklch 0.6 0.08 150)
- `--reelflow-amber` — credits / warning (oklch 0.72 0.09 70)
- `--destructive` — error / failed

Rule: if a color isn't conveying state, it should be neutral.

**Identity exception** — the logo (BrandMark) and template **badges** keep their own
dedicated colors on purpose (they are identity / recognizability markers, not chrome):
`hot` = red, `recommended` = gold/amber, `new` = blue (see `.reelflow-pill[data-tone=
'hot'|'recommended'|'new']`). These are the only decorative colors allowed; everything
else stays neutral.

---

## 2. Typography
- Display headings: `.reelflow-display` (tight tracking, semibold). Page titles ~1.9rem.
- Body: 14px (`text-sm`) default; secondary text `text-muted-foreground`.
- Numbers (credits, durations, ids): `.reelflow-num` (tabular figures).
- Eyebrow/label: `.reelflow-eyebrow` (uppercase, muted, short rule before it).

## 3. Spacing & shape
- Radius: cards/panels `12px`, hero `14px`, pills `999px`, controls ~`8–10px`.
- Section rhythm: `space-y-6` between page sections; `p-6` panel padding.
- Page container: centered, generous side padding (`px-4 sm:px-6 lg:px-8`), max width per surface.
- Whitespace is a feature — prefer air over density.

## 4. Components
- **`.reelflow-panel`** — primary surface: white, hairline border + soft shadow, 12px radius. Use for main content cards.
- **`.reelflow-soft-tile`** — interactive card: white, border, hover = lift (`translateY(-2px)`) + stronger hairline + lift shadow. Use for clickable entries/templates.
- **`.reelflow-muted-tile`** — secondary block: `#f7f7f7` fill, hairline. Use for inset rows / read-only info.
- **`.reelflow-pill`** + `data-tone` (`neutral|info|success|warning|danger|brand`) — status chips; always text + shape, color never alone.
- **Buttons** (shadcn): default = black (`--primary`); `outline` = hairline on white; `ghost` = transparent → muted hover. Destructive = `--destructive`.
- **Icon chips**: small rounded square, `--muted`/neutral background + foreground icon; subtle inset ring; scale slightly on hover within an interactive card.

## 5. Motion
Subtle, quick, purposeful. Easing `cubic-bezier(0.22, 1, 0.36, 1)`, ~180–220ms.
- Card hover: `translateY(-2px)` + shadow/border.
- Affordance: a chevron that nudges `translate-x-0.5` + darkens on hover.
- Entrances: `.reelflow-reveal` (staggered via `data-delay`). The home greeting types out (typewriter) on mount.
- **Always honor `prefers-reduced-motion`** — disable transforms/typing, show final state.

## 6. Principles
1. Monochrome by default; color = meaning.
2. Hairlines over heavy borders; soft shadows over hard ones.
3. One clear primary action per view (black button); everything else quieter.
4. Consistency via tokens + `reelflow-*` classes — no per-component color literals.
5. Accessible contrast + visible focus ring; never rely on color alone for state.

> Reference collection for design-doc patterns: https://github.com/VoltAgent/awesome-design-md

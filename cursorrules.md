# cursorrules.md

**Goal:** Guide AI coding agents (Cursor / Copilot) to implement a sports-as-stocks betting dashboard that anchors to PrizePicks-style lines while presenting a portfolio + “stock price” (Value Index) UX.

This repo’s **primary app** lives in `real-time-chart/` (Next.js 14 App Router, pnpm). See `WARP.md` for shell commands; do **not** duplicate them here.

---

## 1) Ground rules for AI edits

- **Scope:** All app work occurs under `real-time-chart/`.
- **Architectural consistency:** Use the existing UI stack (Next.js App Router, Tailwind, shadcn-style components, Recharts via our `components/ui/chart.tsx` wrapper).
- **TypeScript:** `strict: true`. Prefer explicit types and narrow unions. No `any`.
- **Styling:** Tailwind only; use `cn` helper. Respect dark theme.
- **Performance:** Client components only when needed (charts, interactive panels). Prefer server components for static shells/data plumbing.
- **Safety:** Don’t introduce network calls to proprietary or paid APIs; for the hackathon MVP, read from **mock providers** and local JSON until replaced.
- **Build behavior:** Next builds ignore ESLint/TS errors—**run lint/tsc before merging**. (See `WARP.md`.)
- **Files to avoid touching without reason:** `app/layout.tsx`, Tailwind/ts configs, chart wrapper API. Extend rather than rewrite.

---

## 2) Feature map (what to build)

### A. Home (dashboard)
- **Portfolio Balance Chart** with ranges: `1D | 1W | 1M | 3M | 1Y`.
- **Holdings Summary** table (player × stat × line, direction, qty, avg entry price, current Value Index, UPL/RPL, quick Buy/Sell).
- **Suggestions Panel** (Top 5 by Value Index, Momentum gainers, and one Contrarian).

### B. Player Detail (stock chart)
- **Main chart:** Value Index line + hook lines (±0.5, ±1.5, ±2.5) with tooltips showing P(hit), edge, sensitivity.
- **Projection anchor:** Show current PrizePicks line prominently.
- **Buy/Hold/Sell controls**: buttons for line and nearest hooks.
- **News & Injury sidebar:** metadata chips + latest headlines.

### C. Entry Builder
- Multi-leg builder (2–6 picks).
- Show break-even, combined EV, and correlation warnings (QB+WR same team).

---

## 3) Data layer

### Entities
- Player: id, name, team, position.
- Market: player_id, stat_type, current_line, last_updated.
- ValueIndexTS: timeseries (value_index, model_edge, momentum, sentiment, sigma).
- Position (virtual holding): user_id, player_id, stat, line, direction, qty, entry_value_index, entry_time, exit_value_index.
- NewsItem: player_id, source, title, url, published_at.

### Value Index formula
```
ValueIndex = 100 * (p_model / p_breakEven)^α * (1+Momentum)^β * (1+Sentiment)^γ
```
- Defaults: α=1.0, β=0.5, γ=0.25; cap momentum/sentiment at ±8% / ±5%.
- p_breakEven = per-leg threshold implied by payout table.

---

## 4) UI conventions

- Charts: always use `ChartContainer` from `components/ui/chart.tsx` with a config object for series labels/icons/colors.
- Tailwind dark mode only; green for gains, red for losses; subtle gray dashed lines for hooks.
- Cards: use shadcn `Card` components with padding and rounded corners.
- Typography: GeistSans for body, GeistMono for tickers/numbers.

---

## 5) Collaboration rules

- **When adding charts:** don’t inline Recharts primitives directly. Wrap in `ChartContainer` for theme consistency.
- **When editing data models:** add migrations in `/db/migrations` if schema evolves (for hackathon, JSON mocks acceptable).
- **When adding new UI components:** put in `components/` with clear, typed props; colocate mock data in `/mocks/`.

---

## 6) Hackathon shortcuts

- Mock data: Place under `real-time-chart/mocks/` as JSON, e.g. `player-lines.json`, `value-index-history.json`.
- For news: use a static JSON feed instead of live scraping.
- For real-time feel: use `setInterval` to jitter Value Index by ±1–2 pts within sigma band.

---

**End of cursorrules.md**

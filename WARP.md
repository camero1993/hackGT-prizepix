# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project scope
- The primary application lives in real-time-chart (Next.js 14, App Router) and uses pnpm.
- All commands below assume execution from the repo root and target the real-time-chart subdirectory.

Common commands
- Install dependencies
  - Option A (stay in repo root):
    ```bash path=null start=null
    pnpm -C real-time-chart install
    ```
  - Option B (run inside the app dir):
    ```bash path=null start=null
    cd real-time-chart && pnpm install
    ```
- Start the dev server (Next.js):
  ```bash path=null start=null
  pnpm -C real-time-chart dev
  ```
- Build for production:
  ```bash path=null start=null
  pnpm -C real-time-chart build
  ```
- Start the production server (after build):
  ```bash path=null start=null
  pnpm -C real-time-chart start
  ```
- Lint (Next.js ESLint integration):
  ```bash path=null start=null
  pnpm -C real-time-chart lint
  ```
- Lint with autofix:
  ```bash path=null start=null
  pnpm -C real-time-chart lint -- --fix
  ```
- Type check (strict TypeScript is enabled; Next build is configured to ignore TS errors, so run this explicitly when needed):
  ```bash path=null start=null
  pnpm -C real-time-chart exec tsc --noEmit
  ```
- Tests: No test runner is currently configured in package.json.

High-level architecture
- Framework and routing
  - Next.js 14 with the App Router. The entry points are:
    - real-time-chart/app/layout.tsx defines global HTML structure, imports app/globals.css, sets metadata, and enables @vercel/analytics.
    - real-time-chart/app/page.tsx is a client component composing the main UI from domain components and mock portfolio data.
- UI system
  - Tailwind CSS is the primary styling system (darkMode: class). Global styles are in real-time-chart/app/globals.css. Tailwind content globs include pages, components, app, and src.
  - UI primitives live in real-time-chart/components/ui (shadcn-style components built atop Radix UI). Use the cn helper from real-time-chart/lib/utils.ts for class merging.
  - Fonts: GeistSans/GeistMono via geist/font; applied on <html> and <body> in layout.tsx.
- Domain components and data flow
  - sports-navigation.tsx renders the top navigation with responsive behavior.
  - bet-portfolio.tsx lists “bet holdings” with P&L and status badges.
  - portfolio-balance-chart.tsx shows a summary line chart with selectable time ranges; data is generated locally per selection.
  - bet-holdings-chart.tsx shows a real-time-ish area chart for portfolio value, simulating updates with setInterval; it also renders per-bet performance cards.
  - page.tsx owns mock holdings data, computes totals/derived values, and passes props to the components above.
- Charting abstraction
  - real-time-chart/components/ui/chart.tsx provides a thin wrapper around recharts with:
    - ChartContainer: supplies a React context and injects per-series CSS variables (via a generated <style>), enabling theme-aware coloring (light/dark).
    - ChartTooltipContent and ChartLegendContent: render tooltip/legend content that map series keys to labels/icons via a config object.
  - Components like BetHoldingsChart configure ChartContainer with a config mapping series keys to labels and colors, then use recharts primitives within it.
- Configuration and build behavior
  - next.config.mjs:
    - eslint.ignoreDuringBuilds: true and typescript.ignoreBuildErrors: true. Builds won’t fail on lint or TS errors; use lint and tsc manually when ensuring correctness.
    - images.unoptimized: true to avoid Image Optimization pipeline.
  - tsconfig.json:
    - strict: true; path alias @/* → project root inside real-time-chart; jsx: preserve; moduleResolution: bundler.
  - Tailwind config: extends theme tokens and animations; enables tailwindcss-animate plugin.
- Assets
  - Public assets are under real-time-chart/public.

Notes for agents working in this repo
- Most operations should target the real-time-chart subdirectory. Prefer pnpm -C real-time-chart <script> to avoid changing directories.
- Because Next build ignores ESLint and TS errors, run lint and type checks explicitly when diagnosing issues or before shipping changes.
- When adding or modifying charts, pass a config into ChartContainer to ensure tooltip/legend labels and colors are theme-aware.

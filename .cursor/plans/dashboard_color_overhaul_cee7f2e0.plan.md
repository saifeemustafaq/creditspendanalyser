---
name: Dashboard Color Overhaul
overview: Replace the monochrome grayscale palette across the dashboard with vibrant, semantically meaningful colors -- distinct hues per spending category, colorful charts, tinted badges, and accented summary cards.
todos:
  - id: category-card-colors
    content: Add CATEGORY_COLORS and CARD_COLORS maps to lib/constants.ts with 20 distinct category hues and 4 card-brand colors
    status: pending
  - id: css-chart-vars
    content: Replace grayscale --chart-1 through --chart-5 in globals.css with vibrant oklch colors (light + dark themes)
    status: pending
  - id: colorize-charts
    content: "Update insight-charts.tsx: CategoryChart uses CATEGORY_COLORS per slice, CardComparisonChart uses CARD_COLORS per bar, TopMerchantsChart uses rotating palette"
    status: pending
  - id: category-badge
    content: Create components/category-badge.tsx -- a tinted badge that looks up CATEGORY_COLORS
    status: pending
  - id: dashboard-page
    content: "Update dashboard page.tsx: use CategoryBadge in recent transactions, add left-border accent to summary cards"
    status: pending
  - id: transactions-page
    content: Add category color dot next to the category select in transactions page
    status: pending
  - id: reports-page
    content: Use tinted card-colored badges for card types in reports page
    status: pending
isProject: false
---

# Dashboard Color Overhaul

## Problem

Every chart and badge in the app is grayscale. The root cause is twofold:

1. `**globals.css**` defines all 5 chart colors as pure gray (`oklch(X 0 0)` -- zero chroma):

```56:80:app/globals.css
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
```

1. **No category-to-color mapping exists** anywhere. Every badge uses `variant="secondary"` (gray). The chart PALETTE just cycles through `--chart-1` to `--chart-5`.

## Changes

### 1. Add category and card color maps -- `lib/constants.ts`

Add two new exports:

- `**CATEGORY_COLORS`**: a `Record<Category, string>` mapping all 20 categories to distinct, perceptually balanced HSL colors. Each category gets a unique hue (e.g. Groceries = green, Dining = orange, Travel = blue, Entertainment = purple, etc.).
- `**CARD_COLORS`**: a `Record<CardType, string>` mapping each card type to a brand-adjacent color (Discover = orange, Chase = blue, Amex = teal, Visa = navy).

### 2. Replace the grayscale chart CSS variables -- `app/globals.css`

Replace the 5 `--chart-*` variables in both `:root` and `.dark` with vibrant, accessible colors:


| Variable | Light   | Dark            |
| -------- | ------- | --------------- |
| chart-1  | blue    | lighter blue    |
| chart-2  | emerald | lighter emerald |
| chart-3  | amber   | lighter amber   |
| chart-4  | violet  | lighter violet  |
| chart-5  | rose    | lighter rose    |


These serve as fallback colors for generic charts.

### 3. Colorize charts -- `components/insight-charts.tsx`

- **CategoryChart (pie)**: Replace the 5-color gray PALETTE with a lookup into `CATEGORY_COLORS`. Each pie slice gets its own semantically meaningful color.
- **MonthlyTrendChart (bar)**: Use a vibrant single color (new `--chart-1`). Already references it, so the CSS fix covers this.
- **CardComparisonChart (horizontal bar)**: Color each bar by card type using `CARD_COLORS`, assigning a unique fill per `Cell` instead of one flat color.
- **TopMerchantsChart (horizontal bar)**: Use a gradient of colors from the new colorful PALETTE so each merchant bar is distinct.

### 4. Add a colored category badge utility -- `components/category-badge.tsx` (new file)

A small `<CategoryBadge category={...} />` component that:

- Looks up the category's color from `CATEGORY_COLORS`
- Renders a `<Badge>` with a tinted background (10% opacity fill) and matching text color
- Used everywhere a category label appears

### 5. Apply colored badges across pages

- **Dashboard page** (`[app/(dashboard)/page.tsx](app/(dashboard)`/page.tsx)): Replace `<Badge variant="secondary">{tx.category}</Badge>` in the recent transactions table with `<CategoryBadge>`.
- **Transactions page** (`[app/(dashboard)/transactions/page.tsx](app/(dashboard)`/transactions/page.tsx)): Add a small color dot next to the category select dropdown so users can visually scan categories.
- **Reports page** (`[app/(dashboard)/reports/page.tsx](app/(dashboard)`/reports/page.tsx)): Replace card-type badges with tinted card-colored badges.

### 6. Accent the summary cards -- `app/(dashboard)/page.tsx`

Add a subtle left-border accent color to each of the four summary cards (Total Spend = blue, Transactions = emerald, Top Category = category's own color, MoM = amber/emerald depending on direction). This makes the summary row scannable at a glance.

## Files touched

- `[lib/constants.ts](lib/constants.ts)` -- add `CATEGORY_COLORS`, `CARD_COLORS`
- `[app/globals.css](app/globals.css)` -- replace gray chart variables with colorful ones
- `[components/insight-charts.tsx](components/insight-charts.tsx)` -- use per-category/per-card colors in charts
- `[components/category-badge.tsx](components/category-badge.tsx)` -- new shared component
- `[app/(dashboard)/page.tsx](app/(dashboard)`/page.tsx) -- colored badges + accented summary cards
- `[app/(dashboard)/transactions/page.tsx](app/(dashboard)`/transactions/page.tsx) -- color dot on categories
- `[app/(dashboard)/reports/page.tsx](app/(dashboard)`/reports/page.tsx) -- colored card-type badges


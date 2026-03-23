# Stitch Prompt Guide

How to write prompts that get great results from Google Stitch.

---

## The Formula

**[Screen type] + [Layout] + [Visual tone] + [Key content] + [Device context]**

Example:
> "A dashboard with sidebar navigation, dark mode, three metric cards with sparklines, and a data table. Desktop, professional SaaS aesthetic."

---

## Layout Keywords

### Page Structure
- `sidebar navigation` / `top navigation bar` / `bottom navigation`
- `hero section` / `hero image with overlay text`
- `split layout` / `two-column layout` / `three-column grid`
- `full-bleed header` / `sticky header`
- `card grid` / `masonry grid` / `list view`
- `modal overlay` / `drawer panel` / `flyout menu`

### Component Terms
- `metric card` / `stat card` / `KPI card`
- `data table` / `list view with avatars`
- `form with labels` / `inline form` / `multi-step form`
- `tab navigation` / `breadcrumb` / `pagination`
- `search bar` / `filter chips` / `tag input`
- `progress bar` / `donut chart` / `sparkline`
- `avatar group` / `badge` / `status indicator`
- `empty state with illustration` / `skeleton loader`

---

## Visual Tone Keywords

### Style
- `minimal` / `clean` / `ultra-minimal`
- `dark mode` / `light mode` / `high contrast`
- `editorial` / `magazine-style` / `newspaper grid`
- `brutalist` / `bold typography` / `oversized text`
- `premium` / `luxury` / `glass morphism`
- `corporate` / `enterprise` / `B2B`
- `playful` / `consumer` / `friendly`
- `flat design` / `material design` / `neumorphism`

### Color Directions
- `monochromatic` / `neutral palette` / `greyscale with accent`
- `vibrant accent on dark background`
- `pastel` / `muted tones` / `earthy`
- Specific: `indigo accent`, `emerald green`, `warm amber`

---

## Typography Keywords

- `large headline` / `display typography` / `oversized numbers`
- `compact text` / `dense information layout`
- `Inter` / `Geist` / `Manrope` / `Space Grotesk` (hint, not guaranteed)
- `monospace data` / `tabular numbers`

---

## Density & Spacing

- `generous whitespace` / `airy layout`
- `compact` / `information-dense` / `tight spacing`
- `centered content with max-width` / `full-width fluid`

---

## Device Context

Always specify:
- `Desktop` — 1440px wide layouts
- `Mobile` — 375px, bottom nav, thumb-friendly
- `Tablet` — 768–1024px, adaptive

---

## Weak → Strong Prompt Transformations

| Weak | Strong |
|---|---|
| "A login page" | "A minimal login page with email + password fields, 'Remember me' checkbox, centered card on dark background, desktop" |
| "A dashboard" | "A SaaS analytics dashboard with collapsible sidebar, 4 KPI cards showing revenue/MRR/users/churn, a line chart for the main area, dark mode, desktop" |
| "A settings page" | "A settings page with grouped sections (Profile, Notifications, Security, Billing), left nav, form inputs with labels, light mode, desktop" |
| "A product page" | "An e-commerce product detail page with hero image gallery, product name + price, size selector chips, 'Add to cart' CTA, related products grid, mobile" |
| "Make it look better" | "Add more whitespace, increase font sizes, switch to a dark charcoal background with a teal accent color, remove the border around cards" |

---

## Edit Prompts

When editing, be **specific and surgical**:

✅ `"Change the sidebar background to #1a1a1a, add hover states to nav items"`
✅ `"Replace the table with a card grid, keep the header"`
✅ `"Make the CTA button larger, use a gradient from indigo to violet"`

❌ `"Make it nicer"` — too vague
❌ `"Redesign everything"` — use generate instead

---

## Variants Prompt Guide

For `--range explore`: describe a **direction shift**, not specific changes
> "Make it feel more premium and editorial"
> "Explore a light mode version with warm tones"

For `--range refine`: describe **specific adjustments**
> "Tighten the card padding, reduce font size by one level"
> "Make the color palette more muted and professional"

For `--range reimagine`: describe a **concept**
> "Reimagine this as a terminal-style dark interface"
> "Reimagine with a brutalist editorial aesthetic"



# Updated Plan — Two Additions

## 1. Footer Component
A minimal footer rendered inside `DashboardLayout` (below page content) and on the Landing page. Single line, muted text, centered:

**"Built with Tether WDK · Apache 2.0 · npm install @xzashr/aerofyta"** with a GitHub icon linking to the repo (`https://github.com/xzashr/aerofyta`).

- Dark border-top, small padding, muted-foreground text
- `npm install` portion styled in monospace
- New file: `src/components/layout/Footer.tsx`

## 2. Favicon — Orange Dot
Generate a simple orange (#FF4E00) circle SVG favicon and place it in `public/favicon.svg`. Update `index.html` to reference it:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

The SVG is just a filled circle on transparent background.

---

Both additions integrate into the existing plan — Footer goes into the layout shell step, favicon into the design system step. No other changes to the previously approved plan.


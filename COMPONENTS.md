# RWAkins Component Library

All components use globals.css design tokens.
Never add inline colors outside of these values:

| Token      | Value                  |
|------------|------------------------|
| Background | `#080808`              |
| Surface    | `#0C0C0C`              |
| Gold       | `#F5C518`              |
| White      | `#FFFFFF`              |
| Muted      | `rgba(255,255,255,0.45)` |

---

## ErrorBoundary

File: `hub/components/ErrorBoundary.tsx`

Wraps any section that might fail at runtime.
Shows a recovery UI instead of a white screen.

```tsx
<ErrorBoundary>
  <SomeToolSection />
</ErrorBoundary>
```

Props: `children` (ReactNode)

---

## Skeleton

File: `hub/components/Skeleton.tsx`

Loading placeholder that matches card layout.

Exports:
- `SkeletonCard` — full card placeholder (use for stat cards)
- `SkeletonRow`  — single row placeholder (use for list items)

```tsx
if (loading) return <SkeletonCard />
if (loading) return <><SkeletonRow /><SkeletonRow /></>
```

---

## EmptyState

File: `hub/components/EmptyState.tsx`

Shows when a list is empty and backend is live.

Props:

| Prop       | Type                              | Description              |
|------------|-----------------------------------|--------------------------|
| `icon`     | `string`                          | emoji icon               |
| `title`    | `string`                          | bold heading             |
| `subtitle` | `string`                          | muted description        |
| `action?`  | `{ label: string; onClick: () => void }` | optional CTA button |

```tsx
<EmptyState
  icon="⬟"
  title="No vaults yet"
  subtitle="Create your first encrypted vault"
  action={{ label: 'Create Vault', onClick: openForm }}
/>
```

---

## CopyButton

File: `hub/components/CopyButton.tsx`

Copies text to clipboard. Shows checkmark for 2 seconds.

Props:

| Prop   | Type     | Description       |
|--------|----------|-------------------|
| `text` | `string` | value to copy     |

```tsx
<span>{truncateAddress(wallet)}</span>
<CopyButton text={wallet} />
```

---

## ActivityFeed

File: `hub/components/ActivityFeed.tsx`

Lazy loaded. Shows unified activity across all tools.

Props:

| Prop            | Type     | Default |
|-----------------|----------|---------|
| `walletAddress` | `string` | —       |
| `limit?`        | `number` | `20`    |

```tsx
const ActivityFeed = dynamic(() => import('@/components/ActivityFeed'))
<ActivityFeed walletAddress={address} limit={20} />
```

---

## StakingPanel

File: `hub/components/StakingPanel.tsx`

Lazy loaded. Shows NCRD staking on QIE Mainnet.

Props:

| Prop            | Type     |
|-----------------|----------|
| `walletAddress` | `string` |

---

## LoanChat

File: `hub/components/LoanChat.tsx`

Lazy loaded. AI negotiation chat for Lendora AI.

Props:

| Prop          | Type     |
|---------------|----------|
| `walletAddress` | `string` |
| `backendUrl`  | `string` |

---

## DemoBanner

Inline component used in each page.
Shows when `isDemo` is `true`.
Dismissable with X button.
Gold border, dark background.
Style: always use existing `.card` class.

Text: `"⚡ Demo mode — connect wallet + backend for live data"`

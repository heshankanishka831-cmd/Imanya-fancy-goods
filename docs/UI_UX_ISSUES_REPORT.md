# UI / UX Issues Report

Verified via live browser inspection on `http://localhost:5173` (`1280x800` desktop & `375x812` mobile).

| # | Severity | Page / Component | Issue Description | Status |
|---|---|---|---|---|
| 1 | **Low** | `frontend/src/components/shared/Navbar.tsx` | At `375px` mobile width, the `Sign In` header link wrapped onto two lines (`Sign` / `In`). | **FIXED** (`whitespace-nowrap shrink-0` added; `npm run build` verified). |
| 2 | **Low** | `frontend/src/components/shared/WhatsAppWidget.tsx` + Storefront Footer | On `/shop` when scrolled to the bottom, the fixed bottom-right `WhatsApp Help` floating button overlaps the bottom-right footer text (`Enterprise PostgreSQL 18.7 Transactional Architecture`). | **OPEN** (add bottom padding to footer or offset widget). |
| 3 | **Low** | `frontend/src/app/App.tsx` | SPA route navigation via navbar links preserves the previous page's scroll offset instead of scrolling to top. | **OPEN** (add a `ScrollToTop` component on `useLocation().pathname`). |
| 4 | **Low** | `LoginPage.tsx`, `RegisterPage.tsx` | Primary headings use `<h3>` without an `<h1>` element (minor accessibility/semantics issue). | **OPEN**. |

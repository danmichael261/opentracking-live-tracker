# OpenTracking Live Tracker

A real-time race tracker for [OpenTracking](https://opentracking.co.uk) events. Track any runner with live map, positions, pace, and stats.

![Screenshot](https://img.shields.io/badge/Status-Ready_to_Deploy-brightgreen)

## Features

- **Live Map** — Runner position with checkpoint markers on Leaflet/OSM
- **Real-time Stats** — Speed, pace, elapsed time, battery
- **Three-tier Positions** — Age group, gender, and overall rankings
- **Auto-refresh** — Updates every 30 seconds
- **Mobile Responsive** — Works on phone, tablet, and desktop
- **Dark Mode** — Follows system preference
- **Shareable Links** — `yoursite.com/morland26/5` tracks bib #5

## Architecture

```
Browser  →  /api/proxy  →  OpenTracking API
         ←  JSON data   ←  (CORS proxy)
```

The OpenTracking API doesn't support CORS, so a lightweight Vercel serverless function proxies requests.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for local dev)

### Install

```bash
npm install
```

### Local Development

**Option 1: Vite dev server** (with built-in proxy)

```bash
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/proxy` requests directly to OpenTracking.

**Option 2: Vercel dev** (tests serverless functions too)

```bash
npx vercel dev
```

### Build

```bash
npm run build
```

Output is in `dist/`.

## Deploy to Vercel

### One-click Deploy

1. Push this project to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Click **Deploy** — no configuration needed!

### CLI Deploy

```bash
npx vercel --prod
```

### What Vercel Handles

- Builds the Vite frontend automatically
- Deploys `api/proxy.ts` as a serverless function
- Handles SPA routing via `vercel.json` rewrites
- Free tier includes 100GB bandwidth/month

## URL Structure

| URL | What it shows |
|-----|---------------|
| `/` | Home page — enter event code and bib number |
| `/:event/:bib` | Live tracker for a specific runner |

### Examples

- `/morland26/5` — Track bib #5 in the Morland Marathon 2026
- `/lakedistrict25/42` — Track bib #42 in a Lake District event

## Project Structure

```
opentracking-live-tracker/
├── api/
│   └── proxy.ts              # Vercel serverless CORS proxy
├── src/
│   ├── main.tsx              # Entry point with React Router
│   ├── App.tsx               # Route definitions
│   ├── index.css             # Tailwind CSS
│   ├── types.ts              # TypeScript interfaces
│   ├── pages/
│   │   ├── HomePage.tsx      # Landing page with form
│   │   └── TrackerPage.tsx   # Main tracker view
│   ├── components/
│   │   ├── RaceMap.tsx       # Leaflet map component
│   │   └── StatsPanel.tsx    # Stats sidebar
│   └── utils/
│       ├── api.ts            # API fetch utilities
│       └── positions.ts      # Position calculation algorithm
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.cjs
├── postcss.config.cjs
├── vercel.json               # SPA routing rewrites
└── README.md
```

## Position Calculation

Positions are calculated using a checkpoint + elapsed time algorithm:

1. Runners at a **higher checkpoint** are ahead
2. Runners at the **same checkpoint** are ranked by **elapsed time** (lower = better)
3. Three position categories: age group, gender class, and overall

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS 3, DaisyUI 4
- **Map:** Leaflet + OpenStreetMap
- **Icons:** Lucide React
- **Hosting:** Vercel (frontend + serverless proxy)

## License

MIT

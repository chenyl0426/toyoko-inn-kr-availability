# Toyoko Inn Korea Availability Finder

[简体中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

Select Toyoko Inn hotels across South Korea by region and compare live availability, room types, stay plans, and official prices in one search. This site is a comparison tool only; all bookings are completed on the official Toyoko Inn website.

![Hotel selector](public/og-hotel-selector.png)

## Live demos

- Vercel: [toyoko-inn-korea-availability.vercel.app](https://toyoko-inn-korea-availability.vercel.app)

## Features

- Covers 13 Toyoko Inn hotels in 7 South Korean cities, with regional and individual selection.
- Reuses one set of dates, adults per room, room count, and smoking preference across selected hotels.
- Contacts the official site only after an explicit search; there is no background polling or automated booking.
- Queries up to three hotels concurrently with per-hotel progress and failure isolation.
- Separates available, sold-out, preference-mismatch, and failed states, with per-hotel retry.
- Shows room types, stay plans, standard/member prices, KRW stay totals, and official booking links.
- Stores only the 10 most recent search criteria in the browser, never availability or price results.
- Supports Simplified Chinese, English, Japanese, and Korean from a prominent switcher in the top-right corner.

## Usage

1. Choose a language from the switcher in the top-right corner.
2. Expand a region and select one or more hotels.
3. Enter check-in/check-out dates, adults per room, room count, and a smoking preference.
4. Start the search and follow each hotel's progress.
5. View all hotels, available hotels, or failed searches, and retry an individual hotel when needed.
6. Continue to the official Toyoko Inn website to confirm current inventory, eligibility, and the final price.

## Localization

| Language | Locale |
| --- | --- |
| Simplified Chinese | `zh-CN` |
| English | `en-US` |
| Japanese | `ja-JP` |
| Korean | `ko-KR` |

On the first visit, the interface follows the browser language and falls back to Simplified Chinese for unsupported languages. A manual selection is persisted in `localStorage` and a same-site cookie so refreshes and server rendering stay consistent. Dates, Korea time, and KRW currency use locale-aware formatting; hotel and city names, UI states, forms, errors, and accessibility labels are localized as well.

Japanese room and stay-plan names returned dynamically by the official site remain visible as source text and are paired with localized display names for easier verification.

## Local development

Node.js `>=22.13.0` is required.

```bash
git clone https://github.com/chenyl0426/toyoko-inn-kr-availability.git
cd toyoko-inn-kr-availability
npm ci
npm run dev
```

Open the local URL printed by the development server. No environment variables, D1 database, or R2 bucket are currently required.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the vinext development server |
| `npm run build` | Build the Cloudflare Worker output used by ChatGPT Page / OpenAI Sites |
| `npm run vercel-build` | Run the Next.js build used by Vercel |
| `npm test` | Build and run the server-rendering regression tests |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate migrations if a Drizzle schema is enabled in the future |

## Deployment

### Vercel

`vercel.json` identifies the project as Next.js and sets `npm run vercel-build` as the build command. Import this GitHub repository into Vercel, use `main` as the production branch, and select a Node.js version compatible with `>=22.13.0`. No environment variables are currently required.

### ChatGPT Page / OpenAI Sites

The project is configured for ChatGPT Page through `.openai/hosting.json`, the Sites Vite plugin, and a Cloudflare Worker-compatible build. Run `npm run build`, then publish through the Codex / OpenAI Sites workflow. Do not share Sites project IDs or credentials, and do not manually rewrite managed hosting bindings.

Both deployments use the same source: Vercel runs the Next.js build, while ChatGPT Page runs the vinext / Sites build.

## Project structure

```text
app/                    Pages, components, and the availability API
lib/                    Hotel data, types, localization, and official-site adapter
tests/                  Server-rendering regression tests
public/                 Icons and social preview images
.openai/hosting.json    ChatGPT Page / OpenAI Sites configuration
vercel.json             Vercel build configuration
```

## Data and disclaimer

This project is not affiliated with or operated by Toyoko Inn. Data comes from the official site's public search flow and may change at any time; rate limits, verification requirements, or markup changes can also cause a query to fail. The project does not sign in, book, pay, or store accounts, cookies, inventory, or prices. Always confirm booking conditions and the final price on the official Toyoko Inn website.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished product identity and search form", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>韩国东横INN房况查询<\/title>/);
  assert.match(html, /韩国东横INN房况查询/);
  assert.match(html, /入住日期/);
  assert.match(html, /退房日期/);
  assert.match(html, /placeholder="YYYY-MM-DD"/);
  assert.match(html, /href="#search-form"/);
  assert.doesNotMatch(html, /住见韩国|Your site is taking shape|codex-preview/);
});

test("keeps Material interactions, date entry, source data, and room images wired", async () => {
  const [page, picker, adapter, translations, types, styles, uiCopy] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/date-range-picker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/toyoko-adapter.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/toyoko-translations.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../lib/i18n.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /groupOffers\(state\.visibleOffers\)/);
  assert.match(page, /state\.result\.status === "available"/);
  assert.match(page, /setHotelStates\(\(states\) =>/);
  assert.match(page, /aria-pressed=\{resultView === view\}/);
  assert.doesNotMatch(page, /role="tab(?:list)?"/);
  assert.match(page, /--ripple-x/);
  assert.match(page, /scrollToSearchForm/);
  assert.match(picker, /type="text"/);
  assert.match(picker, /inputMode="numeric"/);
  assert.match(picker, /role="dialog"/);
  assert.match(picker, /CalendarMonth/);
  assert.match(picker, /tabIndex=\{isFocusable \? 0 : -1\}/);
  assert.match(picker, /ArrowLeft/);
  assert.match(picker, /earliestSelectable/);
  assert.match(picker, /requestAnimationFrame/);
  assert.match(styles, /--md-primary:/);
  assert.match(styles, /@keyframes material-ripple/);
  assert.match(uiCopy, /noPreferenceMatch/);
  assert.match(adapter, /\/search\/result\/room_plan\//);
  assert.doesNotMatch(adapter, /\/eng\/search\/result\/room_plan\//);
  assert.match(adapter, /"accept-language": "ja-JP,ja;q=0\.9"/);
  assert.match(adapter, /room\.imageUrls/);
  assert.match(translations, /スタンダードプラン: "标准住宿计划"/);
  assert.match(types, /roomImageUrl: string \| null/);
});

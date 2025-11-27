// src/sources/rugbypass.js
import * as cheerio from "cheerio";

/**
 * Basic RugbyPass scraper
 * - Scrapes the live page for <a class="link-box"> elements
 * - Parses teams from aria-label: "View Ulster vs Benetton rugby union game stats and news"
 * - Extracts match ID from the "g=" query parameter in the href
 *
 * This is a v1: we only get teams + an ID. Time/venue/competition can be added later
 * once we inspect more of the DOM structure.
 */

export async function fetchRugbyPassData() {
  const fixturesUrl = "https://www.rugbypass.com/live/"; // adjust if you want a different live URL

  const fixturesHtml = await fetch(fixturesUrl).then((r) => {
    if (!r.ok) {
      throw new Error(`RugbyPass HTTP ${r.status}`);
    }
    return r.text();
  });

  const fixtures = parseRugbyPassFixtures(fixturesHtml);

  // For now, we don't pull finished results from RugbyPass.
  // You can extend this later with a proper results page.
  const results = [];

  return { fixtures, results };
}

function parseRugbyPassFixtures(html) {
  const $ = cheerio.load(html);
  const out = [];

  // We target the anchors you showed:
  // <a href=".../?g=946485" class="link-box" aria-label="View Ulster vs Benetton rugby union game stats and news">
  $("a.link-box[aria-label*='rugby union']").each((index, el) => {
    const href = $(el).attr("href") || "";
    const aria = $(el).attr("aria-label") || "";

    // Try to get teams from aria-label:
    // "View Ulster vs Benetton rugby union game stats and news"
    let home = null;
    let away = null;

    if (aria.toLowerCase().includes(" vs ")) {
      // Strip leading "View " and trailing " rugby union game stats and news"
      let text = aria.replace(/^View\s*/i, "").trim();
      text = text.replace(/ rugby union game stats and news$/i, "").trim();
      // Now expecting something like "Ulster vs Benetton"
      const parts = text.split(/\s+vs\s+/i);
      if (parts.length === 2) {
        home = parts[0].trim();
        away = parts[1].trim();
      }
    }

    if (!home || !away) {
      return; // skip if we can't reliably parse
    }

    // Try to pull match ID from ?g=xxxxx in the href.
    let matchId = null;
    try {
      const url = new URL(href, "https://www.rugbypass.com");
      matchId = url.searchParams.get("g");
    } catch {
      // ignore URL parse errors; we'll fallback below
    }

    const id = matchId || `rp-fix-${home}-${away}-${index}`;

    out.push({
      id,
      competition: "RugbyPass", // placeholder for now
      home,
      away,
      kickoffIso: null, // unknown for now; can be refined later
      venue: ""
    });
  });

  return out;
}

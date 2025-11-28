// src/sources/rugbypass.js
import https from "https";
import * as cheerio from "cheerio";

/**
 * Simple helper to fetch HTML using Node's https module
 * (no fetch, no undici, no extra deps)
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(`Request failed with status ${res.statusCode} for ${url}`)
          );
          res.resume();
          return;
        }

        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

/**
 * Basic RugbyPass scraper
 * - Scrapes the live page for <a class="link-box"> elements
 * - Parses teams from aria-label: "View Ulster vs Benetton rugby union game stats and news"
 * - Extracts match ID from the "g=" query parameter in the href
 */
export async function fetchRugbyPassData() {
  const fixturesUrl = "https://www.rugbypass.com/live/";

  console.log(`Fetching RugbyPass HTML from ${fixturesUrl}…`);
  const fixturesHtml = await fetchHtml(fixturesUrl);

  const fixtures = parseRugbyPassFixtures(fixturesHtml);

  // For now, results are empty; we can add a results page later
  const results = [];

  console.log(`RugbyPass: parsed ${fixtures.length} fixtures.`);
  return { fixtures, results };
}

function parseRugbyPassFixtures(html) {
  const $ = cheerio.load(html);
  const out = [];

  // We target anchors like:
  // <a href=".../?g=947168" class="link-box" aria-label="View Ulster vs Benetton rugby union game stats and news">
  $("a.link-box[aria-label*='rugby union']").each((index, el) => {
    const href = $(el).attr("href") || "";
    const aria = $(el).attr("aria-label") || "";

    let home = null;
    let away = null;

    if (aria.toLowerCase().includes(" vs ")) {
      // Strip leading "View " and trailing " rugby union game stats and news"
      let text = aria.replace(/^View\s*/i, "").trim();
      text = text.replace(/ rugby union game stats and news$/i, "").trim();

      const parts = text.split(/\s+vs\s+/i);
      if (parts.length === 2) {
        home = parts[0].trim();
        away = parts[1].trim();
      }
    }

    if (!home || !away) {
      return; // skip if we can't parse teams
    }

    // Extract match ID from ?g=xxxxx in href
    let matchId = null;
    try {
      const url = new URL(href, "https://www.rugbypass.com");
      matchId = url.searchParams.get("g");
    } catch {
      // ignore parse errors
    }

    const id = matchId || `rp-fix-${home}-${away}-${index}`;

    out.push({
      id,
      competition: "RugbyPass", // placeholder
      home,
      away,
      kickoffIso: null, // we don't have time yet
      venue: ""
    });
  });

  return out;
}

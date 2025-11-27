// src/sources/rugbypass.js
import * as cheerio from "cheerio";

/**
 * Fetch HTML from RugbyPass and return fixtures + results arrays.
 * You MUST inspect RugbyPass pages in your browser and adjust selectors.
 */
export async function fetchRugbyPassData() {
  // TODO: Pick the real URLs you want for fixtures & results:
  const fixturesUrl = "https://www.rugbypass.com/live/"; // example placeholder
  const resultsUrl = "https://www.rugbypass.com/results/"; // example placeholder

  const [fixturesHtml, resultsHtml] = await Promise.all([
    fetch(fixturesUrl).then((r) => r.text()),
    fetch(resultsHtml).then((r) => r.text())
  ]);

  const fixtures = parseRugbyPassFixtures(fixturesHtml);
  const results = parseRugbyPassResults(resultsHtml);

  return { fixtures, results };
}

/**
 * Parse fixtures HTML from RugbyPass.
 * TODO: open the page in your browser, Inspect Element, and adjust selectors.
 */
function parseRugbyPassFixtures(html) {
  const $ = cheerio.load(html);
  const out = [];

  // EXAMPLE ONLY – you MUST change this
  $(".fixture-row").each((_, el) => {
    const comp = $(el).find(".competition-name").text().trim();
    const home = $(el).find(".team-home .team-name").text().trim();
    const away = $(el).find(".team-away .team-name").text().trim();
    const kickoffText = $(el).find(".match-time").text().trim();
    const venue = $(el).find(".venue").text().trim();

    if (!home || !away) return;

    out.push({
      id: `rp-fix-${home}-${away}-${kickoffText}`.replace(/\s+/g, "-"),
      competition: comp || "RugbyPass",
      home,
      away,
      kickoffIso: kickoffText, // ideally convert to real ISO if possible
      venue
    });
  });

  return out;
}

/**
 * Parse results HTML from RugbyPass.
 * TODO: tweak selectors to match RugbyPass HTML.
 */
function parseRugbyPassResults(html) {
  const $ = cheerio.load(html);
  const out = [];

  $(".result-row").each((_, el) => {
    const comp = $(el).find(".competition-name").text().trim();
    const home = $(el).find(".team-home .team-name").text().trim();
    const away = $(el).find(".team-away .team-name").text().trim();
    const score = $(el).find(".score").text().trim(); // e.g. "27-24"
    const venue = $(el).find(".venue").text().trim();
    const dateText = $(el).find(".match-date").text().trim();

    if (!home || !away || !score) return;

    const [homeScoreRaw, awayScoreRaw] = score.split("-").map((s) => s.trim());
    const homeScore = Number(homeScoreRaw);
    const awayScore = Number(awayScoreRaw);

    out.push({
      id: `rp-res-${home}-${away}-${dateText}`.replace(/\s+/g, "-"),
      competition: comp || "RugbyPass",
      home,
      away,
      homeScore: Number.isNaN(homeScore) ? null : homeScore,
      awayScore: Number.isNaN(awayScore) ? null : awayScore,
      playedIso: dateText, // ideally convert
      venue
    });
  });

  return out;
}

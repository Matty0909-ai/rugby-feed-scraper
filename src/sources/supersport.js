// src/sources/supersport.js
import * as cheerio from "cheerio";

/**
 * Fetch HTML from SuperSport Rugby and return fixtures + results.
 * You MUST inspect selectors yourself and tweak them.
 */
export async function fetchSuperSportData() {
  const fixturesUrl = "https://supersport.com/rugby/fixtures"; // example
  const resultsUrl = "https://supersport.com/rugby/results"; // example

  const [fixturesHtml, resultsHtml] = await Promise.all([
    fetch(fixturesUrl).then((r) => r.text()),
    fetch(resultsHtml).then((r) => r.text())
  ]);

  const fixtures = parseSuperSportFixtures(fixturesHtml);
  const results = parseSuperSportResults(resultsHtml);

  return { fixtures, results };
}

function parseSuperSportFixtures(html) {
  const $ = cheerio.load(html);
  const out = [];

  // EXAMPLE – adjust to real DOM structure:
  $(".fixture-item").each((_, el) => {
    const comp = $(el).find(".fixture-competition").text().trim();
    const home = $(el).find(".fixture-home .team-name").text().trim();
    const away = $(el).find(".fixture-away .team-name").text().trim();
    const kickoffText = $(el).find(".fixture-time").text().trim();
    const venue = $(el).find(".fixture-venue").text().trim();

    if (!home || !away) return;

    out.push({
      id: `ss-fix-${home}-${away}-${kickoffText}`.replace(/\s+/g, "-"),
      competition: comp || "SuperSport",
      home,
      away,
      kickoffIso: kickoffText,
      venue
    });
  });

  return out;
}

function parseSuperSportResults(html) {
  const $ = cheerio.load(html);
  const out = [];

  $(".result-item").each((_, el) => {
    const comp = $(el).find(".result-competition").text().trim();
    const home = $(el).find(".result-home .team-name").text().trim();
    const away = $(el).find(".result-away .team-name").text().trim();
    const score = $(el).find(".result-score").text().trim();
    const venue = $(el).find(".result-venue").text().trim();
    const dateText = $(el).find(".result-date").text().trim();

    if (!home || !away || !score) return;

    const [homeScoreRaw, awayScoreRaw] = score.split("-").map((s) => s.trim());
    const homeScore = Number(homeScoreRaw);
    const awayScore = Number(awayScoreRaw);

    out.push({
      id: `ss-res-${home}-${away}-${dateText}`.replace(/\s+/g, "-"),
      competition: comp || "SuperSport",
      home,
      away,
      homeScore: Number.isNaN(homeScore) ? null : homeScore,
      awayScore: Number.isNaN(awayScore) ? null : awayScore,
      playedIso: dateText,
      venue
    });
  });

  return out;
}

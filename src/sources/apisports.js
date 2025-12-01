// src/sources/apisports.js
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Read the raw games JSON that the GitHub Action fetched via curl,
 * and normalise it into { fixtures, results }.
 */
export async function fetchApiSportsData() {
  const rawPath = resolve("data/raw/apisports-games.json");

  let text;
  try {
    text = readFileSync(rawPath, "utf8");
  } catch (err) {
    throw new Error(
      `Could not read ${rawPath}. Did the curl step run successfully? Original error: ${err.message}`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from ${rawPath}: ${err.message}`
    );
  }

  // API-SPORTS typically returns { response: [ ... ] }
  const games = Array.isArray(json?.response) ? json.response : [];

  console.log(`API-SPORTS (local file): found ${games.length} games`);

  const fixtures = [];
  const results = [];

  for (const g of games) {
    const game = g.game || g.fixture || g;

    const fixtureId =
      game?.id ??
      g.id ??
      `${g.teams?.home?.name || g.home_team}-${g.teams?.away?.name || g.away_team}`;

    const leagueName =
      g.league?.name ||
      g.league?.country ||
      (g.league?.id != null ? String(g.league.id) : "Rugby");

    const homeName =
      g.teams?.home?.name ||
      g.home_team?.name ||
      g.home_team ||
      "Home";

    const awayName =
      g.teams?.away?.name ||
      g.away_team?.name ||
      g.away_team ||
      "Away";

    const dateIso =
      game?.date ||
      g.date ||
      null;

    const venue =
      game?.venue?.name ||
      g.venue?.name ||
      "";

    const rawHomeScore =
      g.scores?.home ??
      g.score?.home ??
      game?.scores?.home ??
      null;

    const rawAwayScore =
      g.scores?.away ??
      g.score?.away ??
      game?.scores?.away ??
      null;

    const homeScore =
      typeof rawHomeScore === "number" ? rawHomeScore : null;

    const awayScore =
      typeof rawAwayScore === "number" ? rawAwayScore : null;

    const normalized = {
      id: String(fixtureId),
      competition: leagueName,
      home: homeName,
      away: awayName,
      homeScore,
      awayScore,
      kickoffIso: dateIso || null,
      venue
    };

    if (homeScore === null && awayScore === null) {
      fixtures.push(normalized);
    } else {
      results.push(normalized);
    }
  }

  console.log(
    `Normalised ${fixtures.length} fixtures and ${results.length} results.`
  );

  return { fixtures, results };
}

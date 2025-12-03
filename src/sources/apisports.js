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

  const games = Array.isArray(json?.response) ? json.response : [];

  console.log(`API-SPORTS (local file): found ${games.length} games`);

  const fixtures = [];
  const results = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];

    // The Rugby API usually returns:
    //  - id
    //  - league: { name, id, ... }
    //  - teams: { home: { name }, away: { name } }
    //  - scores: { home: { total }, away: { total } }
    //  - date
    //  - venue: { name, city }
    //  - status: { short }
    const id = String(g.id ?? g.game_id ?? `game-${i}`);

    const competition = g.league?.name || "Unknown competition";

    const homeTeam = g.teams?.home?.name || "Home";
    const awayTeam = g.teams?.away?.name || "Away";

    const homeScore =
      g.scores?.home?.total ??
      g.scores?.home?.points ??
      g.score?.home ??
      null;

    const awayScore =
      g.scores?.away?.total ??
      g.scores?.away?.points ??
      g.score?.away ??
      null;

    const dateIso = g.date || g.datetime || g.update || null;

    const venue = [g.venue?.name, g.venue?.city].filter(Boolean).join(" • ");

    const statusShort =
      g.status?.short ||
      g.status?.code ||
      (typeof g.status === "string" ? g.status : "");

    const baseObj = {
      id,
      competition,
      home: homeTeam,
      away: awayTeam,
      kickoffIso: dateIso,
      venue,
    };

    // Finished game?
    const finishedCodes = ["FT", "AET", "PEN", "CANC", "WO"];
    const isFinished = finishedCodes.includes(statusShort);

    if (isFinished) {
      results.push({
        ...baseObj,
        homeScore,
        awayScore,
        playedIso: dateIso,
        status: statusShort,
      });
    } else {
      fixtures.push({
        ...baseObj,
        homeScore: null,
        awayScore: null,
        status: statusShort || "NS",
      });
    }
  }

  console.log(
    `Normalised ${fixtures.length} fixtures and ${results.length} results.`
  );

  return { fixtures, results };
}

// src/sources/apisports.js
import https from "https";

const API_BASE = "https://v1.rugby.api-sports.io";

// league 76 = URC, season 2023
const URC_LEAGUE_ID = 76;
const SEASON = 2023;

// Small helper to call the API and return parsed JSON
function fetchFromApi(path, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;

    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = "";
          res.setEncoding("utf8");
          res.on("data", (c) => (errBody += c));
          res.on("end", () => {
            reject(
              new Error(
                `API responded with ${res.statusCode} for ${url}. Body: ${errBody}`
              )
            );
          });
          return;
        }

        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.end();
  });
}

/**
 * Fetch fixtures + results from API-SPORTS directly.
 * Returns: { fixtures: [...], results: [...] }
 */
export async function fetchApiSportsData() {
  const apiKey = process.env.API_RUGBY_KEY;
  if (!apiKey) {
    throw new Error("API_RUGBY_KEY env var is missing");
  }

  // You can tweak the path later (add date, team, etc.)
  const path = `/games?league=${URC_LEAGUE_ID}&season=${SEASON}`;

  console.log(`Calling API-SPORTS: ${API_BASE}${path}`);
  const json = await fetchFromApi(path, apiKey);

  if (!json || !Array.isArray(json.response)) {
    console.warn("API returned no response array:", JSON.stringify(json));
    return { fixtures: [], results: [] };
  }

  const fixtures = [];
  const results = [];

  json.response.forEach((row, index) => {
    const gameId =
      row.id ??
      row.game_id ??
      row.fixture?.id ??
      `game-${URC_LEAGUE_ID}-${SEASON}-${index}`;

    const leagueName =
      row.league?.name ??
      row.league_name ??
      (row.tournament?.name || "Unknown competition");

    const homeName =
      row.teams?.home?.name ??
      row.home?.name ??
      row.home_team ??
      "Home team";

    const awayName =
      row.teams?.away?.name ??
      row.away?.name ??
      row.away_team ??
      "Away team";

    const venueName =
      row.venue?.name ??
      row.stadium?.name ??
      row.venue_name ??
      "";
    const cityName =
      row.venue?.city ??
      row.stadium?.city ??
      row.city ??
      "";

    const dateIso =
      row.date ??
      row.datetime ??
      row.fixture?.date ??
      null;

    // Scores (try a few common shapes)
    const homeScore =
      row.scores?.home ??
      row.scores?.full?.home ??
      row.score?.home ??
      null;
    const awayScore =
      row.scores?.away ??
      row.scores?.full?.away ??
      row.score?.away ??
      null;

    const statusShort =
      row.status?.short ??
      row.status?.code ??
      row.status ??
      "";

    const statusLong =
      row.status?.long ??
      row.status?.description ??
      "";

    const base = {
      id: String(gameId),
      competition: leagueName,
      home: homeName,
      away: awayName,
      kickoffIso: dateIso,
      venue: venueName,
      city: cityName,
    };

    const isFinished =
      typeof statusShort === "string" &&
      ["FT", "AET", "PEN"].includes(statusShort.toUpperCase());

    if (isFinished && homeScore != null && awayScore != null) {
      results.push({
        ...base,
        homeScore,
        awayScore,
        status: statusLong || "Full time",
      });
    } else {
      fixtures.push({
        ...base,
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        status: statusLong || statusShort || "Scheduled",
      });
    }
  });

  console.log(
    `API-SPORTS: got ${fixtures.length} fixtures and ${results.length} results`
  );

  return { fixtures, results };
}

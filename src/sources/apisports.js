// src/sources/apisports.js
import https from "https";

/**
 * Environment variables (set these as GitHub Secrets):
 *
 *  API_RUGBY_BASE = https://v1.rugby.api-sports.io
 *  API_RUGBY_KEY  = your API key from dashboard
 */
const API_BASE =
  process.env.API_RUGBY_BASE || "https://v1.rugby.api-sports.io";
const API_KEY = process.env.API_RUGBY_KEY;

/**
 * Tiny helper to call the API using Node's https (no fetch/undici).
 */
function fetchJson(path, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}${path}${qs ? "?" + qs : ""}`;

    const options = {
      headers: {
        "x-apisports-key": API_KEY,
        Accept: "application/json",
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(
              new Error(
                `Failed to parse JSON from ${url}: ${err.message}\nRaw: ${data.slice(
                  0,
                  300
                )}…`
              )
            );
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

/**
 * Main entry used by src/update.js
 */
export async function fetchApiSportsData() {
  if (!API_KEY) {
    throw new Error(
      "API_RUGBY_KEY is not set. Add it as a GitHub Actions secret."
    );
  }

  // URC = league 76, season 2023 – no date filter so we actually get data.
  const params = {
    league: 76,
    season: 2023,
    // You can add timezone etc. later if you want:
    // timezone: "Africa/Johannesburg",
  };

  console.log("Calling API-SPORTS /games with:", params);

  const json = await fetchJson("/games", params);

  if (!json || !Array.isArray(json.response)) {
    console.log("API-SPORTS: response field is missing or not an array.");
    return { fixtures: [], results: [] };
  }

  const games = json.response;
  console.log(`API-SPORTS: received ${games.length} games.`);

  const fixtures = [];
  const results = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];

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

    const dateIso = g.date || g.datetime || g.updated || null;

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

    // Treat finished games as results, everything else as fixtures
    const isFinished = ["FT", "AET", "PEN", "CANC", "WO"].includes(
      statusShort
    );

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
    `API-SPORTS mapped -> fixtures: ${fixtures.length}, results: ${results.length}`
  );

  return { fixtures, results };
}

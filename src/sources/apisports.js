// src/sources/apisports.js
import https from "https";

/**
 * Build a full URL from base + path + query params.
 */
function buildUrl(base, path, params = {}) {
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Basic JSON fetch using Node's https module.
 * No fetch/undici, no extra deps.
 */
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          reject(
            new Error(
              `HTTP ${res.statusCode} from API: ${body.slice(0, 300)}`
            )
          );
        });
        return;
      }

      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
  });
}

const BASE_URL = "https://v1.rugby.api-sports.io";

/**
 * Fetch fixtures & results from API-SPORTS Rugby.
 *
 * You MUST set RUGBY_API_KEY as an env var (GitHub Secret).
 * Example query: all games for a season.
 * You can refine later with league, date range etc.
 */
export async function fetchApiSportsData() {
  const apiKey = process.env.RUGBY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RUGBY_API_KEY environment variable");
  }

  // TODO: customise these once you know which league/season you care about.
  const params = {
    season: 2024
    // league: 1, // example: add a league ID once you know it
    // from: "2024-01-01",
    // to: "2024-12-31"
  };

  const gamesUrl = buildUrl(BASE_URL, "/games", params);

  console.log(`API-SPORTS: fetching games from ${gamesUrl}`);

  const headers = {
    "x-apisports-key": apiKey
  };

  const json = await fetchJson(gamesUrl, headers);

  // API-SPORTS typically returns { response: [ ... ] }
  const games = Array.isArray(json?.response) ? json.response : [];

  console.log(`API-SPORTS: received ${games.length} games`);

  const fixtures = [];
  const results = [];

  for (const g of games) {
    // Be defensive about nesting, they sometimes use "game" or "fixture".
    const game = g.game || g.fixture || g;

    const fixtureId =
      game?.id ??
      g.id ??
      `${g.teams?.home?.name || g.home_team}-${g.teams?.away?.name || g.away_team}`;

    const leagueName =
      g.league?.name ||
      g.league?.country ||
      g.league?.id?.toString() ||
      "Rugby";

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

    // If both scores are null → treat as upcoming fixture
    if (homeScore === null && awayScore === null) {
      fixtures.push(normalized);
    } else {
      results.push(normalized);
    }
  }

  console.log(
    `API-SPORTS: normalised ${fixtures.length} fixtures and ${results.length} results.`
  );

  return { fixtures, results };
}

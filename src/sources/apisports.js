export async function fetchApiSportsData() {
  const apiKey = process.env.RUGBY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RUGBY_API_KEY environment variable");
  }

  const params = {
    season: 2024
    // league: 1, // we'll add once we see real data
  };

  const gamesUrl = buildUrl(BASE_URL, "/games", params);

  console.log(`API-SPORTS: fetching games from ${gamesUrl}`);

  const headers = {
    "x-apisports-key": apiKey
  };

  const json = await fetchJson(gamesUrl, headers);

  // 🔎 TEMP DEBUG: log the top-level keys and first item
  console.log("API-SPORTS: raw top-level keys:", Object.keys(json || {}));
  if (Array.isArray(json?.response)) {
    console.log("API-SPORTS: response length:", json.response.length);
    if (json.response.length > 0) {
      console.log(
        "API-SPORTS: first item sample:",
        JSON.stringify(json.response[0], null, 2).slice(0, 1000)
      );
    }
  } else {
    console.log(
      "API-SPORTS: response is not an array, raw JSON:",
      JSON.stringify(json, null, 100).slice(0, 1000)
    );
  }

  const games = Array.isArray(json?.response) ? json.response : [];

  console.log(`API-SPORTS: received ${games.length} games`);

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
      typeof rawAwayScore === "number" ? awayScore : null;

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
    `API-SPORTS: normalised ${fixtures.length} fixtures and ${results.length} results.`
  );

  return { fixtures, results };
}

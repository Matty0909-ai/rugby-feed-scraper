// src/update.js
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fetchApiSportsData } from "./sources/apisports.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("Fetching rugby data from API-SPORTS…");

  const { fixtures, results } = await fetchApiSportsData();

  const fixturesPath = join(__dirname, "..", "data", "fixtures.json");
  const resultsPath = join(__dirname, "..", "data", "results.json");

  writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2));
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log(`Wrote ${fixtures.length} fixtures to ${fixturesPath}`);
  console.log(`Wrote ${results.length} results to ${resultsPath}`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});

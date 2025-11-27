// src/update.js
import fs from "node:fs/promises";
import { fetchRugbyPassData } from "./sources/rugbypass.js";
import { fetchSuperSportData } from "./sources/supersport.js";

async function main() {
  console.log("Fetching RugbyPass + SuperSport data…");

  const [rp, ss] = await Promise.allSettled([
    fetchRugbyPassData(),
    fetchSuperSportData()
  ]);

  let fixtures = [];
  let results = [];

  if (rp.status === "fulfilled") {
    fixtures = fixtures.concat(rp.value.fixtures);
    results = results.concat(rp.value.results);
  } else {
    console.error("RugbyPass fetch failed:", rp.reason);
  }

  if (ss.status === "fulfilled") {
    fixtures = fixtures.concat(ss.value.fixtures);
    results = results.concat(ss.value.results);
  } else {
    console.error("SuperSport fetch failed:", ss.reason);
  }

  // Basic de-duplication by id
  fixtures = dedupeById(fixtures);
  results = dedupeById(results);

  // Sort by time-ish (you may improve this once properly ISO)
  fixtures.sort((a, b) => String(a.kickoffIso).localeCompare(String(b.kickoffIso)));
  results.sort((a, b) => String(a.playedIso).localeCompare(String(b.playedIso)));

  console.log(`Writing ${fixtures.length} fixtures and ${results.length} results…`);
  await fs.writeFile("fixtures.json", JSON.stringify(fixtures, null, 2), "utf8");
  await fs.writeFile("results.json", JSON.stringify(results, null, 2), "utf8");

  console.log("Done.");
}

function dedupeById(arr) {
  const map = new Map();
  for (const item of arr) {
    if (!item || !item.id) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

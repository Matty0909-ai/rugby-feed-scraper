// src/update.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { fetchRugbyPassData } from "./sources/rugbypass.js";
import { fetchSuperSportData } from "./sources/supersport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeJson(relativePath, data) {
  const fullPath = path.join(__dirname, "..", relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote ${relativePath} (${data.length} rows)`);
}

async function main() {
  console.log("Fetching from sources…");

  const [rp, ss] = await Promise.allSettled([
    fetchRugbyPassData(),
    fetchSuperSportData()
  ]);

  let fixtures = [];
  let results = [];

  if (rp.status === "fulfilled") {
    fixtures = fixtures.concat(rp.value.fixtures || []);
    results = results.concat(rp.value.results || []);
  } else {
    console.error("RugbyPass failed:", rp.reason);
  }

  if (ss.status === "fulfilled") {
    fixtures = fixtures.concat(ss.value.fixtures || []);
    results = results.concat(ss.value.results || []);
  } else {
    console.error("SuperSport failed:", ss.reason);
  }

  // basic de-dupe by id
  const byId = (acc, row) => {
    if (!row || !row.id) return acc;
    if (!acc.map.has(row.id)) {
      acc.map.set(row.id, row);
      acc.arr.push(row);
    }
    return acc;
  };

  const fx = fixtures.reduce(
    byId,
    { map: new Map(), arr: [] }
  ).arr;

  const rs = results.reduce(
    byId,
    { map: new Map(), arr: [] }
  ).arr;

  writeJson("data/fixtures.json", fx);
  writeJson("data/results.json", rs);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

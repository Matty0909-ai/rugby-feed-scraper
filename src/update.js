// src/update.js
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { fetchApiSportsData } from "./sources/apisports.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function writeJson(relPath, data) {
  const fullPath = join(__dirname, "..", relPath);
  const dir = dirname(fullPath);

  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");

  const count = Array.isArray(data) ? data.length : "n/a";
  console.log(`Wrote ${relPath} (${count} items)`);
}

async function main() {
  try {
    console.log("Fetching rugby data from API-SPORTS…");

    const { fixtures, results } = await fetchApiSportsData();

    writeJson("data/fixtures.json", fixtures || []);
    writeJson("data/results.json", results || []);

    console.log("Update complete.");
  } catch (err) {
    console.error("Update failed:", err);
    process.exit(1);
  }
}

main();

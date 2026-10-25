// Downloads the freely licensed (CC BY-SA 4.0) Wikimedia Commons photos used as representative
// pictures for the launch fleet, at 1280 px, into prisma/seed-photos/, and writes credits.json.
// The demo seed attaches them to the listings with credit and a "representative photo" label.
//
//   node scripts/import-commons-photos.mjs
//
// Licence terms: credit the author, link the licence and the file page, share alike.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("prisma/seed-photos");
const LICENCE = { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };

// [model key, Commons path under /wikipedia/commons/, author]
const PHOTOS = [
  ["vios-black", "7/76/2023_Toyota_Vios_1.5_G_in_Black%2C_front_left.jpg", "Ethan Llamas"],
  ["vios-black", "e/ed/Toyota_Vios_NSP151_FL2_1.5_G_Black.jpg", "Ethan Llamas"],
  ["vios-black", "2/21/Toyota_Vios_NSP151_1.5_G_Black.jpg", "Ethan Llamas"],
  ["vios-black", "0/00/2018_Toyota_Vios_1.5_5-speed_Manual_Facelift_front_view.jpg", "AIMHO'S REBELLION 8490s"],
  ["vios-black", "7/73/ViosNGC102G218StL23FR.jpg", "Celica21gtfour"],

  ["vios-blue", "8/86/2024_Toyota_Vios_1.3_XLE_in_Grayish_Blue_Mica_Mettalic%2C_front_right%2C_06-22-2024.jpg", "Ethan Llamas"],
  ["vios-blue", "9/92/2024_Toyota_Vios_1.3_XLE_in_Grayish_Blue_Mica_Mettalic%2C_rear_right%2C_06-22-2024.jpg", "Ethan Llamas"],
  ["vios-blue", "2/2d/Toyota_Vios_NSP151_FL2_1.5_G_Grayish_Blue_Mica_Metallic_01.jpg", "Ethan Llamas"],
  ["vios-blue", "5/5d/Toyota_Vios_NSP151_FL2_1.5_G_Grayish_Blue_Mica_Metallic_02.jpg", "Ethan Llamas"],
  ["vios-blue", "2/29/2024_Toyota_Vios_1.3_XLE.jpg", "Ethan Llamas"],

  ["avanza-black", "d/d1/2022_Toyota_Avanza_1.5_G_W101LE_%28Philippines%29.jpg", "Ethan Llamas"],
  ["avanza-black", "3/37/Toyota_Avanza_1.3_E_2022_%285%29.jpg", "Ethan Llamas"],
  ["avanza-black", "b/b8/Toyota_Avanza_1.3_J_2023.jpg", "Captainmorlypogi1959"],
  ["avanza-black", "d/d3/Toyota_Avanza_1.5_G_2023.jpg", "Ethan Llamas"],
  ["avanza-black", "7/75/2021_Toyota_Avanza_1.5_G_Toyota_Safety_Sense_%28Indonesia%29_interior_01.jpg", "Andra Febrian"],

  ["veloz-black", "7/72/2021_Toyota_Veloz_1.5_Q_W101RE_%2820220107%29_01.jpg", "オーバードライブ83"],
  ["veloz-black", "3/31/2021_Toyota_Veloz_1.5_Q_W101RE_%2820220107%29_02.jpg", "オーバードライブ83"],
  ["veloz-black", "d/d6/Toyota_Veloz_1.5_E_2025.jpg", "Captainmorlypogi1959"],
  ["veloz-black", "0/08/Toyota_Veloz_1.5_G_2023.jpg", "Captainmorlypogi1959"],
  ["veloz-black", "a/a3/Toyota_Veloz_1.5_V_2022_%285%29.jpg", "Captainmorlypogi1959"],

  ["l300-white", "c/c4/2020_Mitsubishi_L300_FB%2C_front.jpg", "Ethan Llamas"],
  ["l300-white", "2/25/2021_Mitsubishi_L300_FB_Exceed_20221008.jpg", "Ethan Llamas"],
  ["l300-white", "f/f5/Mitsubishi_L300_FL2_2.2_FB_utility_van_01.jpg", "Ethan Llamas"],
  ["l300-white", "8/8f/Mitsubishi_L300_FL2_2.2_FB_utility_van.jpg", "Ethan Llamas"],
  ["l300-white", "c/ce/2023_Mitsubishi_L300_2.2_FB%2C_07-30-2024.jpg", "Ethan Llamas"],
];

// Wikimedia asks automated clients to identify themselves.
const HEADERS = { "User-Agent": "DowntimeCarRental/0.1 (seed photo import; local development)" };

function thumbUrl(commonsPath, width) {
  const file = commonsPath.split("/").pop();
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${commonsPath}/${width}px-${file}`;
}

function filePage(commonsPath) {
  return `https://commons.wikimedia.org/wiki/File:${commonsPath.split("/").pop()}`;
}

const isJpeg = (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch with polite retries: honours Retry-After on 429 and backs off on 5xx. */
async function download(url) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const bytes = Buffer.from(await res.arrayBuffer());
      if (!isJpeg(bytes)) throw new Error("not a JPEG");
      return bytes;
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}`);
    const wait = Math.min(60, Number(res.headers.get("retry-after")) || 5 * attempt);
    process.stdout.write(`  … ${res.status}, waiting ${wait}s
`);
    await sleep(wait * 1000);
  }
  throw new Error("gave up after retries");
}

const credits = [];
const counters = {};
let failures = 0;

for (const [key, commonsPath, author] of PHOTOS) {
  counters[key] = (counters[key] ?? 0) + 1;
  const name = `${String(counters[key]).padStart(2, "0")}.jpg`;
  const dir = path.join(OUT, key);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, name);
  try {
    let bytes;
    const already = await access(target).then(() => true, () => false);
    if (already) {
      bytes = await readFile(target);
    } else {
      bytes = await download(thumbUrl(commonsPath, 1280));
      await writeFile(target, bytes);
    }
    credits.push({
      key,
      file: `${key}/${name}`,
      author,
      licence: LICENCE.name,
      licenceUrl: LICENCE.url,
      source: filePage(commonsPath),
    });
    console.log(`ok   ${key}/${name}  ${(bytes.length / 1024).toFixed(0)} KB  ${author}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ${key}/${name}  ${error.message}  ${commonsPath}`);
  }
  // Be gentle with Wikimedia's servers.
  await sleep(2000);
}

await writeFile(path.join(OUT, "credits.json"), JSON.stringify(credits, null, 2) + "\n");
await writeFile(
  path.join(OUT, "ATTRIBUTION.md"),
  `# Seed photo credits\n\nRepresentative photos of the launch fleet's models (not the actual cars), from Wikimedia Commons,\nlicensed ${LICENCE.name} (${LICENCE.url}). Resized to 1280 px wide by Wikimedia.\n\n| File | Author | Source |\n| --- | --- | --- |\n${credits.map((c) => `| ${c.file} | ${c.author} | ${c.source} |`).join("\n")}\n`,
);
console.log(`\n${credits.length} downloaded, ${failures} failed.`);

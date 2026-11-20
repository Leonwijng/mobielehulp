/**
 * Meldt alle URL's uit de sitemap bij IndexNow (Bing, Yandex, Seznam, Naver
 * en de andere deelnemers delen de melding onderling). Bing voedt ook de
 * zoekfunctie van ChatGPT en Copilot: nieuwe en gewijzigde pagina's staan
 * daar zo binnen dagen in plaats van weken. Google doet niet mee aan
 * IndexNow; daar gaat het via de sitemap in Search Console.
 *
 * Draai dit één keer na elke deploy (niet vaker: steeds dezelfde URL's
 * melden zonder wijziging kan tot een tijdelijke blokkade leiden):
 *
 *   npm run indexnow                    sitemap van de live site
 *   npm run indexnow -- --build         sitemap uit de lokale build (.next)
 *   npm run indexnow -- --droog         alleen tellen, niets versturen
 *   npm run indexnow -- /zwolle/pechhulp https://mobielehulp.nl/sleepdienst
 *                                       alleen deze pagina's
 *
 * (In Git Bash op Windows: geef volledige URL's op, of zet MSYS_NO_PATHCONV=1
 * ervoor. Anders maakt de shell van "/banden-vervangen/ede" een Windows-pad.)
 *
 * De sleutel staat in public/<sleutel>.txt (32 hexadecimale tekens, inhoud
 * gelijk aan de bestandsnaam). Het script controleert eerst of dat bestand
 * live bereikbaar is; zonder dat weigert IndexNow de melding (403).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "mobielehulp.nl";
const DOMEIN = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
/** Maximum per verzoek volgens het protocol. */
const PER_KEER = 10_000;

const args = process.argv.slice(2);
const droog = args.includes("--droog");
const uitBuild = args.includes("--build");
const losse = args.filter((a) => !a.startsWith("--"));

function stop(bericht) {
  console.error(`✗ ${bericht}`);
  process.exit(1);
}

/* ── Sleutel ─────────────────────────────────────────────────────────── */

const sleutelBestanden = fs.readdirSync(path.join(ROOT, "public")).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (sleutelBestanden.length !== 1)
  stop(`Verwacht precies één sleutelbestand public/<32 hex-tekens>.txt, gevonden: ${sleutelBestanden.length}`);
const sleutel = sleutelBestanden[0].replace(/\.txt$/, "");
if (fs.readFileSync(path.join(ROOT, "public", sleutelBestanden[0]), "utf8").trim() !== sleutel)
  stop(`De inhoud van public/${sleutelBestanden[0]} moet gelijk zijn aan de sleutel.`);
const sleutelLocatie = `${DOMEIN}/${sleutel}.txt`;

/* ── URL's ───────────────────────────────────────────────────────────── */

async function sitemapXml() {
  if (uitBuild) {
    const bestand = path.join(ROOT, ".next/server/app/sitemap.xml.body");
    if (!fs.existsSync(bestand)) stop("Geen sitemap in de build gevonden. Draai eerst: npm run build");
    return fs.readFileSync(bestand, "utf8");
  }
  const res = await fetch(`${DOMEIN}/sitemap.xml`, { headers: { "User-Agent": "mobielehulp-indexnow" } });
  if (!res.ok) stop(`${DOMEIN}/sitemap.xml gaf ${res.status}`);
  return res.text();
}

let urls;
if (losse.length) {
  urls = losse.map((a) => (a.startsWith("/") ? `${DOMEIN}${a === "/" ? "" : a}` : a));
} else {
  const xml = await sitemapXml();
  // Alleen <loc> direct onder <url>, niet de <image:loc> van de foto's.
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
urls = [...new Set(urls)];
const vreemd = urls.filter((u) => {
  try {
    return new URL(u).host !== HOST;
  } catch {
    return true;
  }
});
if (vreemd.length) stop(`URL's buiten ${HOST} (IndexNow weigert die): ${vreemd.slice(0, 3).join(", ")}`);
if (!urls.length) stop("Geen URL's gevonden.");

const batches = [];
for (let i = 0; i < urls.length; i += PER_KEER) batches.push(urls.slice(i, i + PER_KEER));
console.log(`${urls.length} URL's in ${batches.length} verzoek(en); sleutel ${sleutelLocatie}`);

if (droog) {
  urls.slice(0, 5).forEach((u) => console.log(`  ${u}`));
  if (urls.length > 5) console.log(`  … en ${urls.length - 5} meer`);
  console.log("Droog: niets verstuurd.");
  process.exit(0);
}

/* ── Controle: staat de sleutel live? ────────────────────────────────── */

const check = await fetch(sleutelLocatie, { headers: { "User-Agent": "mobielehulp-indexnow" } }).catch(() => null);
const live = check?.ok ? (await check.text()).trim() : null;
if (live !== sleutel)
  stop(`${sleutelLocatie} is niet (goed) bereikbaar${check ? ` (${check.status})` : ""}. Eerst deployen, dan melden.`);

/* ── Versturen ───────────────────────────────────────────────────────── */

const UITLEG = {
  200: "ontvangen",
  202: "ontvangen; de sleutel wordt nog gecontroleerd",
  400: "ongeldig verzoek",
  403: "sleutel ongeldig of niet gevonden op de site",
  422: "URL's horen niet bij de host, of de sleutel klopt niet met het protocol",
  429: "te veel verzoeken; probeer het later opnieuw",
};

let mislukt = 0;
for (const [i, urlList] of batches.entries()) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: sleutel, keyLocation: sleutelLocatie, urlList }),
  });
  const ok = res.status === 200 || res.status === 202;
  if (!ok) mislukt++;
  const tekst = ok ? "" : (await res.text().catch(() => "")).slice(0, 300);
  console.log(
    `${ok ? "✓" : "✗"} verzoek ${i + 1}/${batches.length}: ${urlList.length} URL's — ${res.status} ${UITLEG[res.status] ?? ""}${tekst ? `\n  ${tekst}` : ""}`,
  );
}
process.exit(mislukt ? 1 : 0);

/**
 * Echte plaatsgegevens voor de pagina's /[plaats]/[onderwerp] (uit app/data/plaatsinfo.ts, dezelfde
 * open data als de andere sites). Vervangt de verzonnen "hotspots" ("[plaats] ringweg", "A-wegen").
 *
 * De lijst telt ruim 3.600 namen, ook buurtschappen en wegen, keer vijf onderwerpen keer twee
 * adressen. Alleen echte woonplaatsen mogen in Google: pechhulp en sleepdienst overal, de andere
 * onderwerpen in de 400 grootste plaatsen. Alleen het adres /[plaats]/[onderwerp] telt.
 */
import plaatsen from "@/app/data/plaatsen";
import { buurPlaatsen, plaatsen as woonplaatsen, spoedPlaatsen, type Plaats } from "@/app/data/plaatsinfo";
import { normalize } from "@/lib/slug";

const opSleutel = new Map(woonplaatsen.map((p) => [normalize(p.naam), p]));
const naamVoor = new Map<string, string>();
for (const naam of plaatsen as string[]) {
  if (naam.includes("(")) continue;
  const p = opSleutel.get(normalize(naam));
  if (p && !naamVoor.has(p.slug)) naamVoor.set(p.slug, naam);
}
const groot = new Set(spoedPlaatsen.map((p) => p.slug));
const OVERAL = new Set(["pechhulp", "sleepdienst"]);
export const ONDERWERPEN = ["accu-vervangen", "sleepdienst", "pechhulp", "auto-vast-in-modder", "auto-slepen"];

export function echtePlaats(naam: string): Plaats | undefined {
  const p = opSleutel.get(normalize(naam));
  return p && naamVoor.get(p.slug) === naam ? p : undefined;
}

export function indexeerbaar(onderwerp: string, naam: string) {
  const p = echtePlaats(naam);
  return !!p && (OVERAL.has(onderwerp) || groot.has(p.slug));
}

/** Paden /[plaats]/[onderwerp] die in de sitemap horen. */
export function plaatsOnderwerpPaden(): string[] {
  const uit: string[] = [];
  for (const naam of Array.from(naamVoor.values()))
    for (const o of ONDERWERPEN) if (indexeerbaar(o, naam)) uit.push(`/${normalize(naam)}/${o}`);
  return uit;
}

const lijst = (n: string[]) => (n.length < 2 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} en ${n[n.length - 1]}`);

/** Intro, bekende punten en buurplaatsen op basis van echte gegevens; null als die er niet zijn. */
export function lokaleInhoud(naam: string) {
  const p = echtePlaats(naam);
  if (!p) return null;
  const buren = buurPlaatsen(p, 6).map((b) => naamVoor.get(b.slug)).filter((n): n is string => !!n);
  const ligging = p.anker
    ? `${p.anker.naam} ligt zo'n ${p.anker.km} kilometer ten ${p.anker.richting} van ${p.naam}.`
    : `${p.naam} is een van de grotere plaatsen in ${p.provincie}.`;
  const wegen = [...p.snelwegen.slice(0, 3), ...p.nWegen.slice(0, 2)];
  const intro = `Pech in ${p.naam}? ${ligging} ${
    wegen.length ? `Ook op de ${lijst(wegen)} komen we je helpen.` : `We komen naar elke straat en elk adres in ${p.naam}.`
  }${buren.length ? ` Net zo goed rijden we naar ${lijst(buren.slice(0, 4))}.` : ""}`;
  const hotspots = [...p.snelwegen.slice(0, 3), ...p.knelpunten.slice(0, 2).map((k) => k.naam), ...p.wateren.slice(0, 1)];
  return { intro, hotspots, buren };
}

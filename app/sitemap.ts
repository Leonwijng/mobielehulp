import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { plaatsOnderwerpPaden } from "@/lib/lokaal";

/**
 * Eén sitemap: de Nederlandse pagina's zonder /nl en de plaatspagina's die in Google horen.
 * Vervangt public/sitemap.xml (met /de, /en, /fr en verkeerde hreflang) en location-sitemap2.xml
 * (36.000 adressen, elke keer een nieuwe datum).
 */
const DOMEIN = "https://mobielehulp.nl";
const INHOUD_DATUM = "2026-11-20";

function vastePaginas(map: string, prefix = ""): string[] {
  const uit: string[] = [];
  for (const naam of fs.readdirSync(map, { withFileTypes: true })) {
    if (!naam.isDirectory() || naam.name.startsWith("[") || naam.name === "dictionaries") continue;
    const pad = `${prefix}/${naam.name}`;
    if (fs.existsSync(path.join(map, naam.name, "page.tsx"))) uit.push(pad);
    uit.push(...vastePaginas(path.join(map, naam.name), pad));
  }
  return uit;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const vast = ["", ...vastePaginas(path.join(process.cwd(), "app", "[locale]"))];
  return [
    ...vast.map((pad) => ({ url: `${DOMEIN}${pad}`, lastModified: INHOUD_DATUM, priority: pad ? 0.7 : 1 })),
    ...plaatsOnderwerpPaden().map((pad) => ({ url: `${DOMEIN}${pad}`, lastModified: INHOUD_DATUM, priority: 0.5 })),
  ];
}

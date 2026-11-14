// Pflanzenkatalog – alle 52 Arten aus docs/KONZEPT.md.
// variants: natürliche Farben (Fallback). Vorhandene Sprite-Dateien
// (app/data/sprites.json) haben Vorrang, siehe sprites.js.
// kind: grobe Form für den Platzhalter, solange kein Sprite existiert.

import { CONFIG } from './config.js';

export const REGIONS = [
  { id: 'pflanzenhandlung', name: 'Pflanzenhandlung', short: 'Pflanzenhandlung', desc: 'Zimmerpflanzen in Töpfen, Regale und Hängeampeln.' },
  { id: 'gewaechshaus', name: 'Gewächshaus', short: 'Gewächshaus', desc: 'Gemüse und Kräuter in Beeten.' },
  { id: 'blumenwiese', name: 'Blumenwiese', short: 'Blumenwiese', desc: 'Locker verstreute Blumen in vielen Farben.' },
  { id: 'wald', name: 'Wald', short: 'Wald', desc: 'Pilze, Farne und Moos unter Bäumen.' },
];

const RAW = [
  // Pflanzenhandlung
  ['monstera', 'Monstera', 'pflanzenhandlung', 'leaf', []],
  ['alocasia_black_velvet', 'Alocasia Black Velvet', 'pflanzenhandlung', 'leaf', []],
  ['alocasia_dragon_scale', 'Alocasia Dragon Scale', 'pflanzenhandlung', 'leaf', []],
  ['alocasia_jewel', 'Jewel Alocasia', 'pflanzenhandlung', 'leaf', []],
  ['alocasia_mask', 'Mask Alocasia', 'pflanzenhandlung', 'leaf', []],
  ['calathea_orbifolia', 'Calathea orbifolia', 'pflanzenhandlung', 'leaf', []],
  ['calathea_lancifolia', 'Calathea lancifolia', 'pflanzenhandlung', 'leaf', []],
  ['kaktus', 'Kaktus', 'pflanzenhandlung', 'cactus', []],
  ['sukkulente', 'Sukkulente', 'pflanzenhandlung', 'succulent', []],
  ['pilea', 'Pilea', 'pflanzenhandlung', 'leaf', []],
  ['strelitzie', 'Strelitzie', 'pflanzenhandlung', 'leaf', []],
  ['bonsai', 'Bonsai', 'pflanzenhandlung', 'leaf', []],
  ['venusfliegenfalle', 'Venusfliegenfalle', 'pflanzenhandlung', 'succulent', []],
  ['orchidee', 'Orchidee', 'pflanzenhandlung', 'flower', ['weiss', 'rosa', 'lila', 'gelb']],
  // Gewächshaus
  ['tomate', 'Tomate', 'gewaechshaus', 'veg', ['rot', 'gelb']],
  ['gurke', 'Gurke', 'gewaechshaus', 'veg', []],
  ['basilikum', 'Basilikum', 'gewaechshaus', 'leaf', []],
  ['melone', 'Melone', 'gewaechshaus', 'veg', []],
  ['kuerbis', 'Kürbis', 'gewaechshaus', 'veg', []],
  ['chili', 'Chili', 'gewaechshaus', 'veg', ['rot', 'gelb', 'orange']],
  ['erdbeere', 'Erdbeere', 'gewaechshaus', 'berry', ['weiss', 'rosa']],
  ['paprika', 'Paprika', 'gewaechshaus', 'veg', ['rot', 'gelb', 'orange', 'gruen']],
  ['aubergine', 'Aubergine', 'gewaechshaus', 'veg', []],
  ['zucchini', 'Zucchini', 'gewaechshaus', 'veg', []],
  ['mais', 'Mais', 'gewaechshaus', 'veg', []],
  // Blumenwiese
  ['gaensebluemchen', 'Gänseblümchen', 'blumenwiese', 'flower', []],
  ['mohn', 'Mohn', 'blumenwiese', 'flower', ['rot', 'orange', 'rosa', 'weiss']],
  ['kornblume', 'Kornblume', 'blumenwiese', 'flower', ['blau', 'lila', 'rosa', 'weiss']],
  ['lavendel', 'Lavendel', 'blumenwiese', 'flower', ['lila', 'rosa', 'weiss']],
  ['lilie', 'Lilie', 'blumenwiese', 'flower', ['weiss', 'rosa', 'orange', 'gelb', 'rot']],
  ['sonnenblume', 'Sonnenblume', 'blumenwiese', 'flower', ['gelb', 'rotbraun']],
  ['edelnelke', 'Edelnelke', 'blumenwiese', 'flower', ['rot', 'rosa', 'weiss']],
  ['rose', 'Rose', 'blumenwiese', 'flower', ['rot', 'rosa', 'weiss', 'gelb']],
  ['germini', 'Germini', 'blumenwiese', 'flower', ['rot', 'orange', 'rosa', 'gelb', 'weiss']],
  ['tulpe', 'Tulpe', 'blumenwiese', 'flower', ['rot', 'gelb', 'rosa', 'weiss', 'orange', 'lila']],
  ['vergissmeinnicht', 'Vergissmeinnicht', 'blumenwiese', 'flower', ['blau', 'rosa', 'weiss']],
  ['fingerhut', 'Fingerhut', 'blumenwiese', 'flower', ['lila', 'weiss', 'rosa']],
  ['mohnfeld', 'Mohnfeld', 'blumenwiese', 'flower', []],
  ['pusteblume', 'Pusteblume', 'blumenwiese', 'flower', []],
  // Wald
  ['fliegenpilz', 'Fliegenpilz', 'wald', 'mushroom', []],
  ['steinpilz', 'Steinpilz', 'wald', 'mushroom', []],
  ['pfifferling', 'Pfifferling', 'wald', 'mushroom', []],
  ['butterpilz', 'Butterpilz', 'wald', 'mushroom', []],
  ['farn', 'Farn', 'wald', 'leaf', []],
  ['efeu', 'Efeu', 'wald', 'leaf', []],
  ['heidelbeere', 'Heidelbeerstrauch', 'wald', 'berry', []],
  ['gluehmoos', 'Moospolster mit Glühpilzen', 'wald', 'glowmoss', []],
  ['maigloeckchen', 'Maiglöckchen', 'wald', 'flower', ['weiss', 'rosa']],
  ['hexenring', 'Hexenring', 'wald', 'glowmoss', []],
  ['walderdbeere', 'Walderdbeere', 'wald', 'berry', []],
  ['baerlauch', 'Bärlauch', 'wald', 'leaf', []],
  ['zunderschwamm', 'Zunderschwamm', 'wald', 'mushroom', []],
];

export const PLANTS = RAW.map(([id, name, region, kind, variants]) => ({
  id,
  name,
  region,
  kind,
  variants,
  price: CONFIG.plantPrices[id] ?? 200,
}));

export const PLANT_BY_ID = Object.fromEntries(PLANTS.map((p) => [p.id, p]));
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export function plantsOfRegion(regionId) {
  return PLANTS.filter((p) => p.region === regionId);
}

export const VARIANT_LABELS = {
  rot: 'Rot', orange: 'Orange', rosa: 'Rosa', weiss: 'Weiß', gelb: 'Gelb',
  blau: 'Blau', lila: 'Lila', rotbraun: 'Rotbraun', gruen: 'Grün',
};

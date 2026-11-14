// Farbrampen – gespiegelt aus tools/sprites/palette.py (dort ist die Quelle).
// [outline, shade, base, light, highlight]
export const RAMPS = {
  leaf: ['#1e3a2c', '#2e5e3c', '#468a48', '#78b45a', '#b4d66c'],
  leaf_deep: ['#14301f', '#1f4c33', '#2f7042', '#4f9a50', '#86c062'],
  leaf_sage: ['#2a3a32', '#46604c', '#6a8a66', '#94b080', '#c2d4a0'],
  stem: ['#24402c', '#3a6038', '#5a8a44', '#86b058', '#b0d070'],
  moss: ['#1f3324', '#2f5232', '#4a7a3e', '#74a04a', '#a6c860'],
  soil: ['#2a1c18', '#3e2a22', '#563a2c', '#6e4c38', '#8a6248'],
  terracotta: ['#4e2620', '#83402e', '#b4603e', '#d8875a', '#eeb284'],
  wood: ['#3a2418', '#5e3c26', '#86583a', '#a87a52', '#c89e70'],
  cap_red: ['#4a161c', '#8e2428', '#c63e36', '#e8684a', '#f6a078'],
  cream: ['#6a5a4a', '#b8a48a', '#dccbb0', '#f0e6d2', '#fbf6ea'],
  petal_red: ['#4e1418', '#962228', '#d4382e', '#f06a48', '#fca07a'],
  petal_orange: ['#5a2a12', '#a8501e', '#e47c2c', '#f8a64a', '#fdd080'],
  petal_pink: ['#5a2238', '#a44a6a', '#dc7a98', '#f2a6ba', '#fcd2dc'],
  petal_white: ['#5e5a62', '#a8a2ac', '#d8d4da', '#f2eff2', '#ffffff'],
  petal_yellow: ['#5a4410', '#a8801e', '#e4b832', '#f6d856', '#fdf090'],
  petal_blue: ['#1e2a5a', '#30489c', '#4c70d0', '#78a0ec', '#b0ccf8'],
  petal_purple: ['#2e1e4a', '#56388a', '#8060bc', '#a888dc', '#d2bcf2'],
  dark: ['#120e12', '#1e181e', '#2c242a', '#3e343a', '#58484e'],
  // Regionsrampen aus tools/sprites/palette_<region>.py (für Möbel/Beete)
  gh_earth: ['#1c1410', '#2c1e16', '#3e2a1e', '#54382a', '#704e3a'],
  ph_pot_slate: ['#262c3c', '#424a60', '#626e86', '#8894ac', '#b2bcce'],
  // nur App (Boden, Glow)
  glow: ['#3a5a4a', '#6ab890', '#a6f0c0', '#d4ffe0', '#ffffff'],
  lamp: ['#5a4410', '#c89030', '#ffd27a', '#fff0b8', '#ffffff'],
};

export const VARIANT_RAMP = {
  rot: 'petal_red', orange: 'petal_orange', rosa: 'petal_pink', weiss: 'petal_white',
  gelb: 'petal_yellow', blau: 'petal_blue', lila: 'petal_purple', rotbraun: 'cap_red',
};

export function hexToRgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

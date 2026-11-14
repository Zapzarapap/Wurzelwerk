// Register der Regions-Szenen. Jede Region lebt in ihrer eigenen Datei
// (API: docs/SZENEN.md). Diese Datei nur ändern, wenn eine Region dazukommt.
import pflanzenhandlung from './pflanzenhandlung.js';
import gewaechshaus from './gewaechshaus.js';
import blumenwiese from './blumenwiese.js';
import wald from './wald.js';

export const SCENES = { pflanzenhandlung, gewaechshaus, blumenwiese, wald };

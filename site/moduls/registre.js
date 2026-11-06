// Afegir un mòdul és crear la seva carpeta i afegir-lo aquí, a regles.js i als fulls del manual.
import { crea3D as cables3D } from './cables/3d.js';
import { creaJoc as cablesJoc } from './cables/joc.js';
import { crea3D as boto3D } from './boto/3d.js';
import { creaJoc as botoJoc } from './boto/joc.js';
import { crea3D as sequencia3D } from './sequencia/3d.js';
import { creaJoc as sequenciaJoc } from './sequencia/joc.js';
import { crea3D as memoria3D } from './memoria/3d.js';
import { creaJoc as memoriaJoc } from './memoria/joc.js';

export const MODULS = {
  cables: { crea3D: cables3D, creaJoc: cablesJoc },
  boto: { crea3D: boto3D, creaJoc: botoJoc },
  sequencia: { crea3D: sequencia3D, creaJoc: sequenciaJoc },
  memoria: { crea3D: memoria3D, creaJoc: memoriaJoc },
};

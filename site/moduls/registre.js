// Afegir un mòdul és crear la seva carpeta i afegir-lo aquí, a regles.js i als fulls del manual.
import { crea3D as cables3D } from './cables/3d.js';
import { creaJoc as cablesJoc } from './cables/joc.js';
import { crea3D as boto3D } from './boto/3d.js';
import { creaJoc as botoJoc } from './boto/joc.js';
import { crea3D as sequencia3D } from './sequencia/3d.js';
import { creaJoc as sequenciaJoc } from './sequencia/joc.js';
import { crea3D as memoria3D } from './memoria/3d.js';
import { creaJoc as memoriaJoc } from './memoria/joc.js';
import { crea3D as contrasenya3D } from './contrasenya/3d.js';
import { creaJoc as contrasenyaJoc } from './contrasenya/joc.js';
import { crea3D as simbols3D } from './simbols/3d.js';
import { creaJoc as simbolsJoc } from './simbols/joc.js';
import { crea3D as laberint3D } from './laberint/3d.js';
import { creaJoc as laberintJoc } from './laberint/joc.js';
import { crea3D as morse3D } from './morse/3d.js';
import { creaJoc as morseJoc } from './morse/joc.js';

export const MODULS = {
  cables: { crea3D: cables3D, creaJoc: cablesJoc },
  boto: { crea3D: boto3D, creaJoc: botoJoc },
  sequencia: { crea3D: sequencia3D, creaJoc: sequenciaJoc },
  memoria: { crea3D: memoria3D, creaJoc: memoriaJoc },
  contrasenya: { crea3D: contrasenya3D, creaJoc: contrasenyaJoc },
  simbols: { crea3D: simbols3D, creaJoc: simbolsJoc },
  laberint: { crea3D: laberint3D, creaJoc: laberintJoc },
  morse: { crea3D: morse3D, creaJoc: morseJoc },
};

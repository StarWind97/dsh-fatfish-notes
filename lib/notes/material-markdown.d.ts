import { type T } from '../domain/localization.js';
/** Omitting a selected file removes the live link/image, retaining an honest caption. */
export declare function omitMaterials(body: string, assets: ReadonlySet<string>, files: ReadonlySet<string>, t?: T): string;

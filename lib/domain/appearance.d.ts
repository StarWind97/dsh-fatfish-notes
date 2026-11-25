/** Local presentation only. Never serialize this into a note or repository. */
export declare const layouts: {
    readonly soft: "appearanceLayoutSoft";
    readonly outline: "appearanceLayoutOutline";
    readonly tree: "appearanceLayoutTree";
};
export declare const layoutDescriptions: {
    readonly soft: "appearanceLayoutSoftDesc";
    readonly outline: "appearanceLayoutOutlineDesc";
    readonly tree: "appearanceLayoutTreeDesc";
};
export declare const legacyLayoutMap: Record<string, keyof typeof layouts>;
export declare const palettes: {
    readonly berry: "appearancePaletteBerry";
    readonly native: "appearancePaletteNative";
    readonly pine: "appearancePalettePine";
    readonly amber: "appearancePaletteAmber";
    readonly rose: "appearancePaletteRose";
    readonly graphite: "appearancePaletteGraphite";
};
export declare const paletteDescriptions: {
    readonly berry: "appearancePaletteBerryDesc";
    readonly native: "appearancePaletteNativeDesc";
    readonly pine: "appearancePalettePineDesc";
    readonly amber: "appearancePaletteAmberDesc";
    readonly rose: "appearancePaletteRoseDesc";
    readonly graphite: "appearancePaletteGraphiteDesc";
};
export declare const legacyRetiredPalettes: Set<string>;
export declare const cjkFonts: {
    readonly host: "appearanceFollow";
    readonly yahei: "appearanceFontYahei";
    readonly deng: "appearanceFontDeng";
    readonly song: "appearanceFontSong";
    readonly kai: "appearanceFontKai";
};
export declare const latinFonts: {
    readonly host: "appearanceFollow";
    readonly segoe: "appearanceFontSegoe";
    readonly arial: "appearanceFontArial";
    readonly georgia: "appearanceFontGeorgia";
    readonly times: "appearanceFontTimes";
};
export interface Appearance {
    version: 1;
    layout: keyof typeof layouts;
    palette: keyof typeof palettes;
    contrast: 'standard' | 'soft' | 'strong';
    mode: 'host' | 'light' | 'dark';
    fontCjk: keyof typeof cjkFonts;
    fontLatin: keyof typeof latinFonts;
    reading: 'modern' | 'book' | 'mixed';
    size: 16 | 17 | 18 | 20;
    leading: 1.65 | 1.8 | 2;
    codeWeight: 300 | 400 | 500;
    codeSize: 12 | 14 | 16;
    codeWrap: boolean;
    codeLines: boolean;
    materials: 'bottom' | 'right';
    rightStyle: 'tabs' | 'stack';
    materialStyle: 'compact' | 'cards';
    pinned: boolean;
    tabs: boolean;
    density: 'compact' | 'balanced' | 'spacious';
}
export declare const defaultAppearance: Appearance;
export declare function migrateLayout(raw: unknown): unknown;
export declare function migratePalette(raw: unknown): unknown;
export declare function appearanceValue(raw: unknown): Appearance;
export declare function parseAppearance(raw: string | null): Appearance;
export declare const appearanceKey = "dsh-fatfish-notes.private.paper.appearance.v1";

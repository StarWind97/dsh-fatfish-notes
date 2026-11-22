/** Local presentation only. Never serialize this into a note or repository. */
export declare const layouts: {
    readonly outline: "appearanceLayoutOutline";
    readonly soft: "appearanceLayoutSoft";
    readonly ribbon: "appearanceLayoutRibbon";
    readonly dock: "appearanceLayoutDock";
    readonly ink: "appearanceLayoutInk";
    readonly tree: "appearanceLayoutTree";
    readonly island: "appearanceLayoutIsland";
    readonly archive: "appearanceLayoutArchive";
};
export declare const palettes: {
    readonly native: "appearancePaletteNative";
    readonly lilac: "appearancePaletteLilac";
    readonly mint: "appearancePaletteMint";
    readonly blue: "appearancePaletteBlue";
    readonly amber: "appearancePaletteAmber";
    readonly rose: "appearancePaletteRose";
    readonly graphite: "appearancePaletteGraphite";
    readonly clearblue: "appearancePaletteClearblue";
    readonly pine: "appearancePalettePine";
    readonly inkwhite: "appearancePaletteInkwhite";
};
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
export declare function appearanceValue(raw: unknown): Appearance;
export declare function parseAppearance(raw: string | null): Appearance;
export declare const appearanceKey = "dsh-fatfish-notes.private.paper.appearance.v1";

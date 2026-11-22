/** Local presentation only. Never serialize this into a note or repository. */
export const layouts = { outline: 'appearanceLayoutOutline', soft: 'appearanceLayoutSoft', ribbon: 'appearanceLayoutRibbon', dock: 'appearanceLayoutDock', ink: 'appearanceLayoutInk', tree: 'appearanceLayoutTree', island: 'appearanceLayoutIsland', archive: 'appearanceLayoutArchive' };
export const palettes = { native: 'appearancePaletteNative', lilac: 'appearancePaletteLilac', mint: 'appearancePaletteMint', blue: 'appearancePaletteBlue', amber: 'appearancePaletteAmber', rose: 'appearancePaletteRose', graphite: 'appearancePaletteGraphite', clearblue: 'appearancePaletteClearblue', pine: 'appearancePalettePine', inkwhite: 'appearancePaletteInkwhite' };
export const cjkFonts = { host: 'appearanceFollow', yahei: 'appearanceFontYahei', deng: 'appearanceFontDeng', song: 'appearanceFontSong', kai: 'appearanceFontKai' };
export const latinFonts = { host: 'appearanceFollow', segoe: 'appearanceFontSegoe', arial: 'appearanceFontArial', georgia: 'appearanceFontGeorgia', times: 'appearanceFontTimes' };
export const defaultAppearance = { version: 1, layout: 'outline', palette: 'native', contrast: 'standard', mode: 'host', reading: 'modern', fontCjk: 'host', fontLatin: 'host', size: 17, leading: 1.8, codeWeight: 400, codeSize: 14, codeWrap: false, codeLines: false, materials: 'bottom', rightStyle: 'tabs', materialStyle: 'compact', pinned: false, tabs: true, density: 'compact' };
const options = { fontCjk: Object.keys(cjkFonts), fontLatin: Object.keys(latinFonts), layout: Object.keys(layouts), palette: Object.keys(palettes), contrast: ['standard', 'soft', 'strong'], mode: ['host', 'light', 'dark'], reading: ['modern', 'book', 'mixed'], size: [16, 17, 18, 20], leading: [1.65, 1.8, 2], codeWeight: [300, 400, 500], codeSize: [12, 14, 16], materials: ['bottom', 'right'], rightStyle: ['tabs', 'stack'], materialStyle: ['compact', 'cards'], density: ['compact', 'balanced', 'spacious'] };
export function appearanceValue(raw) {
    const result = { ...defaultAppearance };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return result;
    const value = raw;
    if (value.version !== undefined && value.version !== 1)
        return result;
    for (const key of Object.keys(result)) {
        // Legacy fixed modes are retired; retain every other local preference.
        if (key === 'version' || key === 'mode')
            continue;
        const next = value[key], valid = options[key]?.includes(next) ?? (typeof next === 'boolean');
        if (valid)
            result[key] = next;
    }
    return result;
}
export function parseAppearance(raw) { try {
    return appearanceValue(JSON.parse(raw ?? 'null'));
}
catch {
    return { ...defaultAppearance };
} }
export const appearanceKey = 'dsh-fatfish-notes.private.paper.appearance.v1';

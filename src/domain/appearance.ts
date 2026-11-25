/** Local presentation only. Never serialize this into a note or repository. */
export const layouts = {
  soft: 'appearanceLayoutSoft',
  outline: 'appearanceLayoutOutline',
  tree: 'appearanceLayoutTree',
} as const
export const layoutDescriptions = {
  soft: 'appearanceLayoutSoftDesc',
  outline: 'appearanceLayoutOutlineDesc',
  tree: 'appearanceLayoutTreeDesc',
} as const
export const legacyLayoutMap: Record<string, keyof typeof layouts> = {
  island: 'soft',
  ribbon: 'outline',
  dock: 'outline',
  ink: 'outline',
  archive: 'outline',
}
export const palettes = {
  berry: 'appearancePaletteBerry',
  native: 'appearancePaletteNative',
  pine: 'appearancePalettePine',
  amber: 'appearancePaletteAmber',
  rose: 'appearancePaletteRose',
  graphite: 'appearancePaletteGraphite',
} as const
export const paletteDescriptions = {
  berry: 'appearancePaletteBerryDesc',
  native: 'appearancePaletteNativeDesc',
  pine: 'appearancePalettePineDesc',
  amber: 'appearancePaletteAmberDesc',
  rose: 'appearancePaletteRoseDesc',
  graphite: 'appearancePaletteGraphiteDesc',
} as const
export const legacyRetiredPalettes = new Set(['clearblue', 'lilac', 'mint', 'blue', 'inkwhite'])
export const cjkFonts = { host: 'appearanceFollow', yahei: 'appearanceFontYahei', deng: 'appearanceFontDeng', song: 'appearanceFontSong', kai: 'appearanceFontKai' } as const
export const latinFonts = { host: 'appearanceFollow', segoe: 'appearanceFontSegoe', arial: 'appearanceFontArial', georgia: 'appearanceFontGeorgia', times: 'appearanceFontTimes' } as const
export interface Appearance {
  version: 1
  layout: keyof typeof layouts
  palette: keyof typeof palettes
  contrast: 'standard' | 'soft' | 'strong'
  mode: 'host' | 'light' | 'dark'
  fontCjk: keyof typeof cjkFonts
  fontLatin: keyof typeof latinFonts
  reading: 'modern' | 'book' | 'mixed'
  size: 16 | 17 | 18 | 20
  leading: 1.65 | 1.8 | 2
  codeWeight: 300 | 400 | 500
  codeSize: 12 | 14 | 16
  codeWrap: boolean
  codeLines: boolean
  materials: 'bottom' | 'right'
  rightStyle: 'tabs' | 'stack'
  materialStyle: 'compact' | 'cards'
  pinned: boolean
  tabs: boolean
  density: 'compact' | 'balanced' | 'spacious'
}
export const defaultAppearance: Appearance = {
  version: 1,
  layout: 'outline',
  palette: 'native',
  contrast: 'standard',
  mode: 'host',
  reading: 'modern',
  fontCjk: 'host',
  fontLatin: 'host',
  size: 17,
  leading: 1.8,
  codeWeight: 400,
  codeSize: 14,
  codeWrap: false,
  codeLines: false,
  materials: 'bottom',
  rightStyle: 'tabs',
  materialStyle: 'compact',
  pinned: false,
  tabs: true,
  density: 'compact',
}
const options: Partial<Record<keyof Appearance, readonly unknown[]>> = {
  fontCjk: Object.keys(cjkFonts),
  fontLatin: Object.keys(latinFonts),
  layout: Object.keys(layouts),
  palette: Object.keys(palettes),
  contrast: ['standard', 'soft', 'strong'],
  mode: ['host', 'light', 'dark'],
  reading: ['modern', 'book', 'mixed'],
  size: [16, 17, 18, 20],
  leading: [1.65, 1.8, 2],
  codeWeight: [300, 400, 500],
  codeSize: [12, 14, 16],
  materials: ['bottom', 'right'],
  rightStyle: ['tabs', 'stack'],
  materialStyle: ['compact', 'cards'],
  density: ['compact', 'balanced', 'spacious'],
}
export function migrateLayout(raw: unknown): unknown {
  return typeof raw === 'string' && Object.hasOwn(legacyLayoutMap, raw) ? legacyLayoutMap[raw] : raw
}
export function migratePalette(raw: unknown): unknown {
  return typeof raw === 'string' && legacyRetiredPalettes.has(raw) ? 'native' : raw
}
export function appearanceValue(raw: unknown): Appearance {
  const result = { ...defaultAppearance }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  const value = raw as Record<string, unknown>
  if (value.version !== undefined && value.version !== 1) return result
  for (const key of Object.keys(result) as (keyof Appearance)[]) {
    // Legacy fixed modes are retired; retain every other local preference.
    if (key === 'version' || key === 'mode') continue
    const next = key === 'layout' ? migrateLayout(value[key]) : key === 'palette' ? migratePalette(value[key]) : value[key]
    const valid = options[key]?.includes(next) ?? (typeof next === 'boolean')
    if (valid) (result as unknown as Record<string, unknown>)[key] = next
  }
  return result
}
export function parseAppearance(raw: string | null): Appearance {
  try {
    return appearanceValue(JSON.parse(raw ?? 'null'))
  } catch {
    return { ...defaultAppearance }
  }
}
export const appearanceKey = 'dsh-fatfish-notes.private.paper.appearance.v1'

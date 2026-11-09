export type PaperSurface = 'embedded' | 'standalone'
export interface ColumnPreference { open: boolean | null; book: number; list: number }
export const defaultColumns: ColumnPreference = { open: null, book: 196, list: 312 }
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function columnPreference(raw: string | null): ColumnPreference {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!value || typeof value !== 'object') return { ...defaultColumns }
    const candidate = value as Partial<ColumnPreference>
    return {
      open: typeof candidate.open === 'boolean' ? candidate.open : null,
      book: typeof candidate.book === 'number' && Number.isFinite(candidate.book) ? clamp(candidate.book, 164, 260) : defaultColumns.book,
      list: typeof candidate.list === 'number' && Number.isFinite(candidate.list) ? clamp(candidate.list, 240, 440) : defaultColumns.list,
    }
  } catch { return { ...defaultColumns } }
}

/** Hysteresis uses the available plugin width, never the desktop screen width. */
export function wideColumns(width: number, previous: boolean) { return width >= (previous ? 1100 : 1140) }
export function columnSizes(available: number, preference: ColumnPreference, wide: boolean) {
  const expanded = wide && preference.open !== false
  const book = preference.book
  // At very small widths the existing single-pane layout takes over in CSS.
  const listMax = Math.max(200, Math.min(440, available - (expanded ? book : 0) - 460))
  const list = clamp(preference.list, Math.min(240, listMax), listMax)
  const bookMax = Math.max(164, Math.min(260, available - list - 460))
  return { expanded, book, list, bookMax, listMax, listMin: Math.min(240, listMax) }
}

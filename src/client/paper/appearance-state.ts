import type { Appearance } from '../../domain/appearance.js'
export * from '../../domain/appearance.js'

const accent: Record<Appearance['palette'], [string, string]> = {
  berry: ['#91318e', '#d877d5'],
  native: ['#3b6fe0', '#7aaaff'],
  pine: ['#146c56', '#52cfa9'],
  amber: ['#9e5a1e', '#e6b16c'],
  rose: ['#b5385c', '#ef8ba6'],
  graphite: ['#333d4b', '#c4cdd8'],
}

/** Three visual dots [primary, secondary/tint, surface] for settings swatches. */
export const paletteSwatches: Record<Appearance['palette'], [string, string, string]> = {
  berry: ['#A337A0', '#529849', '#f7eaf7'],
  native: ['#3b6fe0', '#8cb4fb', '#edf3fe'],
  pine: ['#146c56', '#52cfa9', '#e8f7f1'],
  amber: ['#9e5a1e', '#dfb074', '#f9efe0'],
  rose: ['#b5385c', '#ea9cb2', '#fae9ee'],
  graphite: ['#333d4b', '#8e9bab', '#eceff3'],
}

export type AppearanceColors = {
  paper: string
  shelf: string
  ink: string
  muted: string
  rule: string
  accent: string
  onAccent: string
  selected: string
  overlay: string
  input: string
  codeBg: string
  summaryBg: string
  danger: string
  dangerSoft: string
  success: string
  successSoft: string
}

export function appearanceColors(
  value: Appearance,
  dark: boolean,
  host?: Partial<AppearanceColors>,
): AppearanceColors {
  const a = accent[value.palette][dark ? 1 : 0]
  const base = dark ? '#18191d' : '#ffffff'
  const shelf = dark ? '#131418' : '#f7f8fa'
  const onAccent = dark ? '#131418' : '#ffffff'
  const danger = dark ? '#fc8181' : '#c53030'
  const dangerSoft = dark ? 'rgba(252, 129, 129, 0.14)' : '#fef2f2'
  const success = dark ? '#5cd68d' : '#1d8348'
  const successSoft = dark ? 'rgba(92, 214, 141, 0.14)' : '#eaf6ef'

  const native: AppearanceColors = {
    paper: base,
    shelf,
    ink: dark ? '#f1f2f6' : '#16181d',
    muted: dark ? '#9ca2b0' : '#616773',
    rule: dark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.10)',
    accent: a,
    onAccent,
    selected: dark ? `color-mix(in srgb, ${base} 84%, ${a})` : `color-mix(in srgb, ${base} 89%, ${a})`,
    overlay: dark ? '#202228' : '#ffffff',
    input: dark ? '#1d1f25' : '#ffffff',
    codeBg: dark ? '#111216' : '#f4f6f8',
    summaryBg: dark ? `color-mix(in srgb, ${base} 91%, ${a})` : `color-mix(in srgb, #fafbfc 93%, ${a})`,
    danger,
    dangerSoft,
    success,
    successSoft,
    ...host,
  }

  // Dark mode keeps clean neutral charcoal surfaces without muddy color-mix wash.
  const result: AppearanceColors =
    value.palette === 'native'
      ? native
      : dark
        ? {
            ...native,
            accent: a,
            selected: `color-mix(in srgb, ${base} 84%, ${a})`,
            summaryBg: `color-mix(in srgb, ${base} 91%, ${a})`,
            rule: `color-mix(in srgb, rgba(255, 255, 255, 0.11) 88%, ${a})`,
          }
        : {
            ...native,
            paper: `color-mix(in srgb, #ffffff 99%, ${a})`,
            shelf: `color-mix(in srgb, #f7f8fa 95%, ${a})`,
            accent: a,
            selected: `color-mix(in srgb, #ffffff 89%, ${a})`,
            rule: `color-mix(in srgb, #e5e7eb 86%, ${a})`,
            codeBg: `color-mix(in srgb, #f4f6f8 96%, ${a})`,
            summaryBg: `color-mix(in srgb, #faf9fb 93%, ${a})`,
          }

  if (value.contrast === 'soft') {
    return {
      ...result,
      shelf: `color-mix(in srgb, ${result.paper} 55%, ${result.shelf})`,
      rule: `color-mix(in srgb, ${result.paper} 50%, ${result.rule})`,
    }
  }
  if (value.contrast === 'strong') {
    return {
      ...result,
      rule: dark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(15, 23, 42, 0.24)',
      selected: `color-mix(in srgb, ${result.paper} ${dark ? 72 : 80}%, ${result.accent})`,
    }
  }
  return result
}

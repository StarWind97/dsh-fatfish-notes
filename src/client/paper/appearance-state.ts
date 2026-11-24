import type { Appearance } from '../../domain/appearance.js'
export * from '../../domain/appearance.js'

const accent: Record<Appearance['palette'], [string, string]> = {
  berry: ['#91318e', '#d877d5'],
  native: ['#4176e6', '#7aaaff'],
  pine: ['#176753', '#5eceae'],
  clearblue: ['#285dce', '#7aaaff'],
  amber: ['#8c5a2b', '#e2b073'],
  lilac: ['#70529b', '#bfa3e8'],
  mint: ['#276b60', '#70cbb9'],
  blue: ['#3b6483', '#8ab8dc'],
  rose: ['#98465f', '#e69ab1'],
  graphite: ['#465463', '#b0bfce'],
  inkwhite: ['#303b4c', '#c1cfdf'],
}

/** Three visual dots [primary, secondary/tint, surface] for settings swatches. */
export const paletteSwatches: Record<Appearance['palette'], [string, string, string]> = {
  berry: ['#A337A0', '#529849', '#faf5fa'],
  native: ['#4176e6', '#7aaaff', '#f5f7fb'],
  pine: ['#176753', '#5eceae', '#f2f8f6'],
  clearblue: ['#285dce', '#7aaaff', '#f3f7fe'],
  amber: ['#8c5a2b', '#e2b073', '#faf5ec'],
  lilac: ['#70529b', '#bfa3e8', '#f7f4fb'],
  mint: ['#276b60', '#70cbb9', '#f2f9f7'],
  blue: ['#3b6483', '#8ab8dc', '#f3f7fa'],
  rose: ['#98465f', '#e69ab1', '#fbf4f6'],
  graphite: ['#465463', '#b0bfce', '#f5f6f8'],
  inkwhite: ['#303b4c', '#c1cfdf', '#f6f7f9'],
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

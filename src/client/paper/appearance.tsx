import * as React from 'react'
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import {
  appearanceColors,
  defaultAppearance,
  cjkFonts,
  latinFonts,
  layouts,
  layoutDescriptions,
  palettes,
  paletteSwatches,
  type Appearance,
  type AppearanceColors,
} from './appearance-state.js'
import { appearanceCss } from './appearance-style.js'
import { codeFontCss } from './appearance-assets.js'
import type { LocaleKey, T } from '../locale.js'
import { CaptureAppearance } from '../CaptureAppearance.js'
import type { SettingsTab } from '../SettingsTabs.js'
import { appearancePreferences } from '../appearance-sync.js'
import { brandStyle } from '../brand-palette.js'

export const setAppearance = (patch: Partial<Appearance>) => appearancePreferences.set(patch)
export function useAppearance() {
  return useSyncExternalStore(appearancePreferences.subscribe, appearancePreferences.getSnapshot, appearancePreferences.getSnapshot)
}

function hostAppearance() {
  if (typeof document === 'undefined') return { dark: false, colors: {}, font: 'system-ui, sans-serif' }
  const body = getComputedStyle(document.body), html = getComputedStyle(document.documentElement)
  const dark =
    document.body.dataset.dsDarkTheme === 'true' ||
    (document.body.hasAttribute('data-ds-dark-theme') && document.body.dataset.dsDarkTheme !== 'false') ||
    body.colorScheme === 'dark' ||
    html.colorScheme === 'dark'
  const fields: Partial<Record<keyof AppearanceColors, string>> = {
    paper: '--dsw-alias-bg-base',
    shelf: '--dsw-specific-sidebar-fill',
    ink: '--dsw-alias-label-primary',
    muted: '--dsw-alias-label-secondary',
    rule: '--dsw-alias-border-l2',
    accent: '--dsw-alias-link',
    selected: '--dsw-alias-interactive-bg-hover',
    overlay: '--dsw-alias-bg-layer-2',
    input: '--dsw-alias-bg-layer-1',
  }
  const colors: Partial<AppearanceColors> = {}
  for (const [key, variable] of Object.entries(fields)) {
    const color = body.getPropertyValue(variable).trim()
    if (color) (colors as Record<string, string>)[key] = color
  }
  return { dark, colors, font: body.fontFamily }
}

type ThemeMode = Appearance['mode']
let hostSnapshot: ReturnType<typeof hostAppearance> | undefined, hostRevision = 0
const hostListeners = new Set<() => void>()
let hostObserver: MutationObserver | undefined

function refreshHost() {
  const next = hostAppearance()
  if (hostSnapshot && next.dark !== hostSnapshot.dark) hostRevision++
  if (JSON.stringify(next) !== JSON.stringify(hostSnapshot)) {
    hostSnapshot = next
    for (const fn of hostListeners) fn()
  }
}
function hostSnapshotValue() {
  if (!hostSnapshot) hostSnapshot = hostAppearance()
  return hostSnapshot
}
function subscribeHost(fn: () => void) {
  if (!hostListeners.size) {
    hostObserver = new MutationObserver(refreshHost)
    for (const node of [document.body, document.documentElement]) {
      hostObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'data-ds-dark-theme'] })
    }
  }
  hostListeners.add(fn)
  refreshHost()
  return () => {
    hostListeners.delete(fn)
    if (!hostListeners.size) {
      hostObserver?.disconnect()
      hostObserver = undefined
      hostSnapshot = undefined
    }
  }
}
function useHostAppearance() {
  return useSyncExternalStore(subscribeHost, hostSnapshotValue, hostSnapshotValue)
}

const ThemeContext = createContext<{ mode: ThemeMode; locked: boolean; setMode: (mode: ThemeMode) => void }>({
  mode: 'host',
  locked: true,
  setMode: () => {},
})

/** Portals inherit their originating view. Temporary modes never enter localStorage. */
export function AppearanceScope({ children, followHost = false }: { children: React.ReactNode; followHost?: boolean }) {
  useHostAppearance()
  const [choice, setChoice] = useState<{ mode: ThemeMode; revision: number } | null>(null)
  const mode = followHost || choice?.revision !== hostRevision ? 'host' : choice.mode
  return (
    <ThemeContext.Provider
      value={{
        mode,
        locked: followHost,
        setMode: next => {
          if (!followHost) setChoice({ mode: next, revision: hostRevision })
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
export function useAppearanceTheme() {
  return useContext(ThemeContext)
}

/** For branding outside the full paper view, such as the first-use setup. */
export function useBrandStyle() {
  const host = useHostAppearance(), { mode } = useAppearanceTheme()
  return brandStyle(mode === 'host' ? host.dark : mode === 'dark') as React.CSSProperties
}

export function useAppearanceProps() {
  const value = useAppearance(), host = useHostAppearance(), { mode } = useAppearanceTheme()
  const dark = mode === 'host' ? host.dark : mode === 'dark'
  const colors = appearanceColors(value, dark, dark === host.dark ? host.colors : undefined)
  const sans = '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
  const serif = '"Noto Serif CJK SC", "Songti SC", SimSun, Georgia, serif'
  const readingFont = readingFonts(value, host.font)
  const headingFont = value.reading === 'modern' ? readingFont : serif
  const style = {
    ...brandStyle(dark),
    '--ink': colors.ink,
    '--muted': colors.muted,
    '--base': colors.paper,
    '--paper': colors.paper,
    '--shelf': colors.shelf,
    '--rule': colors.rule,
    '--accent': colors.accent,
    '--on-accent': colors.onAccent,
    '--selected': colors.selected,
    '--overlay': colors.overlay,
    '--input': colors.input,
    '--code-bg': colors.codeBg,
    '--summary-bg': colors.summaryBg,
    '--danger': colors.danger,
    '--danger-soft': colors.dangerSoft,
    '--success': colors.success,
    '--success-soft': colors.successSoft,
    '--reading-font': readingFont,
    '--heading-font': headingFont,
    '--reading-size': value.size + 'px',
    '--reading-leading': value.leading,
    '--code-size': value.codeSize + 'px',
    '--code-weight': value.codeWeight,
    '--serif': value.reading === 'modern' ? sans : serif,
    '--dsw-alias-label-primary': colors.ink,
    '--dsw-alias-label-secondary': colors.muted,
    '--dsw-alias-bg-layer-1': colors.paper,
    '--dsw-alias-bg-layer-2': colors.shelf,
    '--dsw-alias-border-l2': colors.rule,
    colorScheme: dark ? 'dark' : 'light',
  } as React.CSSProperties
  return {
    style,
    'data-layout': value.layout,
    'data-palette': value.palette,
    'data-theme': dark ? 'dark' : 'light',
    'data-density': value.density,
    'data-code-wrap': value.codeWrap,
    'data-code-lines': value.codeLines,
  }
}

const cjkFamily = { host: '', yahei: 'Microsoft YaHei', deng: 'DengXian', song: 'SimSun', kai: 'KaiTi' }
const latinFamily = { host: '', segoe: 'Segoe UI', arial: 'Arial', georgia: 'Georgia', times: 'Times New Roman' }

function readingFonts(value: Appearance, host: string) {
  if (value.fontCjk === 'host' && value.fontLatin === 'host') return host || 'system-ui, sans-serif'
  const latin = latinFamily[value.fontLatin], cjk = cjkFamily[value.fontCjk]
  return [...(latin ? [`"${latin}"`] : ['"Segoe UI"', 'Arial']), ...(cjk ? [`"${cjk}"`] : []), host || 'system-ui', 'sans-serif'].join(',')
}

function FontPreview({ t }: { t: T }) {
  const value = useAppearance(), [missing, setMissing] = useState<string[]>([])
  useEffect(() => {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return
    const sample = '\u9605\u8bfb\u7b14\u8bb0 AaWim 0123'
    const width = (font: string) => {
      context.font = `32px ${font}`
      return context.measureText(sample).width
    }
    setMissing(
      [cjkFamily[value.fontCjk], latinFamily[value.fontLatin]].filter(
        font => font && ['monospace', 'serif'].every(fallback => width(`"${font}",${fallback}`) === width(fallback)),
      ),
    )
  }, [value.fontCjk, value.fontLatin])
  return (
    <>
      <div
        className="appearance-font-preview"
        style={{ fontFamily: readingFonts(value, getComputedStyle(document.body).fontFamily), fontSize: value.size, lineHeight: value.leading }}
      >
        {t('appearanceFontExample')}
      </div>
      {!!missing.length && <p>{t('appearanceFontMissing', { fonts: new Intl.ListFormat(t.language).format(missing) })}</p>}
      <p>{t('appearanceFontNote')}</p>
    </>
  )
}

export function AppearanceStyle() {
  return <style>{codeFontCss + appearanceCss}</style>
}

export function AppearanceStatus({ t }: { t: T }) {
  const sync = useSyncExternalStore(appearancePreferences.subscribeStatus, appearancePreferences.getStatus, appearancePreferences.getStatus)
  return (
    <p role={sync === 'error' ? 'status' : undefined} className="appearance-sync-status">
      {sync === 'error'
        ? t('appearanceStatusError')
        : sync === 'saving'
          ? t('appearanceStatusSaving')
          : sync === 'connecting'
            ? t('appearanceStatusConnecting')
            : sync === 'waiting'
              ? t('appearanceStatusWaiting')
              : t('appearanceStatusSaved')}
      {sync === 'error' && (
        <button type="button" onClick={appearancePreferences.refresh}>
          {t('noteRetry')}
        </button>
      )}
    </p>
  )
}

export function AppearanceReset({ t }: { t: T }) {
  const theme = useAppearanceTheme()
  return (
    <button
      type="button"
      onClick={() => {
        setAppearance(defaultAppearance)
        theme.setMode('host')
      }}
    >
      {t('appearanceReset')}
    </button>
  )
}

export function AppearanceFields({ group, t }: { group: 'appearance' | 'reading' | 'workspace'; t: T }) {
  const value = useAppearance(), theme = useAppearanceTheme()
  const labels = (keys: Record<string, LocaleKey>) => Object.fromEntries(Object.entries(keys).map(([id, key]) => [id, t(key)]))

  function select<K extends keyof Appearance>(key: K, label: string, options: Record<string, string>) {
    return (
      <label className="appearance-field">
        <span>{label}</span>
        <select
          aria-label={label}
          value={String(value[key])}
          onChange={e => setAppearance({ [key]: typeof value[key] === 'number' ? Number(e.target.value) : e.target.value })}
        >
          {Object.entries(options).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  function segmented(label: string, current: string, options: Record<string, string>, onSelect: (id: string) => void) {
    return (
      <div className="appearance-field">
        <span className="appearance-field-label">{label}</span>
        <div className="paper-segmented" role="group" aria-label={label}>
          {Object.entries(options).map(([id, name]) => (
            <button key={id} type="button" aria-pressed={current === id} onClick={() => onSelect(id)}>
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function check(key: 'tabs' | 'pinned' | 'codeWrap' | 'codeLines', label: string) {
    return (
      <label className="appearance-check">
        <input type="checkbox" checked={value[key]} onChange={e => setAppearance({ [key]: e.target.checked })} />
        {label}
      </label>
    )
  }

  return (
    <section className="appearance-settings">
      {group === 'appearance' && (
        <>
          <section className="appearance-card" aria-label={t('appearanceLayouts')}>
            <header className="appearance-card-head">
              <h3>{t('appearanceLayouts')}</h3>
            </header>
            <div className="appearance-layouts">
              {(Object.entries(layouts) as [keyof typeof layouts, LocaleKey][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.layout === key}
                  onClick={() => setAppearance({ layout: key })}
                >
                  <span className={'layout-glyph layout-' + key} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="layout-card-text">
                    <strong>{t(label)}</strong>
                    <small>{t(layoutDescriptions[key])}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="appearance-card" aria-label={t('appearancePalette')}>
            <header className="appearance-card-head">
              <h3>{t('appearancePalette')}</h3>
            </header>
            <div className="appearance-palettes" role="group" aria-label={t('appearancePalette')}>
              {(Object.entries(palettes) as [keyof typeof palettes, LocaleKey][]).map(([key, label]) => {
                const [c1, c2, c3] = paletteSwatches[key]
                return (
                  <button
                    key={key}
                    type="button"
                    className="appearance-palette-card"
                    aria-pressed={value.palette === key}
                    onClick={() => setAppearance({ palette: key })}
                  >
                    <span className="palette-dots" aria-hidden="true">
                      <i style={{ background: c1 }} />
                      <i style={{ background: c2 }} />
                      <i style={{ background: c3 }} />
                    </span>
                    <span>{t(label)}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="appearance-card" aria-label={t('appearanceColors')}>
            <header className="appearance-card-head">
              <h3>{t('appearanceColors')}</h3>
            </header>
            <div className="appearance-fields">
              {!theme.locked &&
                segmented(
                  t('appearanceTheme'),
                  theme.mode,
                  { host: t('appearanceFollow'), light: t('appearanceLight'), dark: t('appearanceDark') },
                  id => theme.setMode(id as ThemeMode),
                )}
              {segmented(
                t('appearanceContrast'),
                value.contrast,
                { soft: t('appearanceSoft'), standard: t('appearanceStandard'), strong: t('appearanceStrong') },
                id => setAppearance({ contrast: id as Appearance['contrast'] }),
              )}
              {segmented(
                t('appearanceDensity'),
                value.density,
                { compact: t('appearanceCompact'), balanced: t('appearanceBalanced'), spacious: t('appearanceSpacious') },
                id => setAppearance({ density: id as Appearance['density'] }),
              )}
            </div>
            <p className="appearance-hint">{theme.locked ? t('dshThemeHint') : t('appearanceWindowHint')}</p>
          </section>
        </>
      )}

      {group === 'reading' && (
        <section className="appearance-card" aria-label={t('appearanceTextCode')}>
          <header className="appearance-card-head">
            <h3>{t('appearanceTextCode')}</h3>
          </header>
          <div className="appearance-fields">
            {segmented(
              t('appearanceReadingPreset'),
              value.reading,
              { modern: t('appearanceModern'), book: t('appearanceBook'), mixed: t('appearanceMixed') },
              id => setAppearance({ reading: id as Appearance['reading'] }),
            )}
            {select('fontCjk', t('appearanceCjkFont'), labels(cjkFonts))}
            {select('fontLatin', t('appearanceLatinFont'), labels(latinFonts))}
            {select('size', t('appearanceTextSize'), { 16: '16 px', 17: '17 px', 18: '18 px', 20: '20 px' })}
            {select('leading', t('appearanceLeading'), {
              '1.65': t('appearanceLeadingCompact'),
              '1.8': t('appearanceLeadingComfort'),
              '2': t('appearanceLeadingLoose'),
            })}
            {select('codeWeight', t('appearanceCodeWeight'), { 300: '300', 400: '400', 500: '500' })}
            {select('codeSize', t('appearanceCodeSize'), { 12: '12 px', 14: '14 px', 16: '16 px' })}
          </div>
          <div className="appearance-checks">
            {check('codeWrap', t('appearanceCodeWrap'))}
            {check('codeLines', t('appearanceCodeLines'))}
          </div>
          <FontPreview t={t} />
        </section>
      )}

      {group === 'workspace' && (
        <section className="appearance-card" aria-label={t('settingsWorkspace')}>
          <header className="appearance-card-head">
            <h3>{t('settingsWorkspace')}</h3>
          </header>
          <div className="appearance-fields">
            {segmented(
              t('appearanceMaterialsPosition'),
              value.materials,
              { bottom: t('appearanceBottom'), right: t('appearanceRight') },
              id => setAppearance({ materials: id as Appearance['materials'] }),
            )}
            {segmented(
              t('appearanceRightLayout'),
              value.rightStyle,
              { tabs: t('appearanceRightTabs'), stack: t('appearanceRightStack') },
              id => setAppearance({ rightStyle: id as Appearance['rightStyle'] }),
            )}
            {segmented(
              t('appearanceMaterialsLayout'),
              value.materialStyle,
              { compact: t('appearanceMaterialsCompact'), cards: t('appearanceMaterialsCards') },
              id => setAppearance({ materialStyle: id as Appearance['materialStyle'] }),
            )}
          </div>
          <div className="appearance-checks">
            {check('pinned', t('appearancePinMaterials'))}
            {check('tabs', t('appearanceShowOpenTabs'))}
          </div>
        </section>
      )}
    </section>
  )
}

export function appearanceTabs(t: T): SettingsTab[] {
  return [
    { id: 'appearance', label: t('settingsAppearance'), content: <AppearanceFields group="appearance" t={t} /> },
    { id: 'reading', label: t('settingsReading'), content: <AppearanceFields group="reading" t={t} /> },
    {
      id: 'workspace',
      label: t('settingsWorkspace'),
      content: (
        <>
          <AppearanceFields group="workspace" t={t} />
          <CaptureAppearance t={t} />
        </>
      ),
    },
  ]
}

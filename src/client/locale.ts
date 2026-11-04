import zh from '../../locale/zh.json' with { type: 'json' }
import en from '../../locale/en.json' with { type: 'json' }
export const NS = 'dsh-github-notebook'
export type LocaleKey = keyof typeof zh
export type T = (key: LocaleKey, params?: Record<string, unknown>) => string
export const dictionaries = {zh,en} satisfies Record<'zh'|'en', Record<LocaleKey,string>>
export const translate: T = (key,params) => zh[key].replace(/\{([^}]+)\}/g, (_,name: string) => String(params?.[name] ?? `{${name}}`))
declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'dsh-github-notebook': LocaleKey } }

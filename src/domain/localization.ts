import zh from '../../locale/zh.json' with { type: 'json' }
import en from '../../locale/en.json' with { type: 'json' }

export type Language = 'zh' | 'en'
export type LocaleKey = keyof typeof zh
export type T = {
  (key: LocaleKey, params?: Record<string, unknown>): string
  readonly language: Language
}
export const dictionaries = {zh,en} satisfies Record<Language, Record<LocaleKey,string>>

export function resolveLanguage(locale: string | undefined): Language {
  return !locale || locale === '*' || /^zh(?:-|$)/i.test(locale) ? 'zh' : 'en'
}

function createTranslator(language: Language): T {
  const catalog:Readonly<Partial<Record<string,string>>>=dictionaries[language]
  const plurals=new Intl.PluralRules(language)
  return Object.assign(
    (key: LocaleKey, params?: Record<string, unknown>) => {
      const base=dictionaries[language][key],count=params?.count
      const message=typeof count==='number'?catalog[`${key}.${plurals.select(count)}`]??base:base
      return message.replace(
        /\{\{[^{}]+\}\}|\{([^{}]+)\}/g,
        (value: string, name: string | undefined) => name === undefined ? value : String(params?.[name] ?? value),
      )
    },
    {language},
  )
}

const translators = {zh:createTranslator('zh'), en:createTranslator('en')}
export const translator = (language: Language): T => translators[language]

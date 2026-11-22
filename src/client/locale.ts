import {resolveLanguage,translator,type LocaleKey} from '../domain/localization.js'
export {dictionaries,translator,type Language,type LocaleKey,type T} from '../domain/localization.js'
export const NS = 'dsh-fatfish-notes'
export const clientLanguage = () => resolveLanguage(globalThis.document?.documentElement.lang)
export const currentTranslator = () => translator(clientLanguage())
export const translate = translator('zh')
declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'dsh-fatfish-notes': LocaleKey } }

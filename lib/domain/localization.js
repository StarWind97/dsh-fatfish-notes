import zh from '../../locale/zh.json' with { type: 'json' };
import en from '../../locale/en.json' with { type: 'json' };
export const dictionaries = { zh, en };
export function resolveLanguage(locale) {
    return !locale || locale === '*' || /^zh(?:-|$)/i.test(locale) ? 'zh' : 'en';
}
function createTranslator(language) {
    const catalog = dictionaries[language];
    const plurals = new Intl.PluralRules(language);
    return Object.assign((key, params) => {
        const base = dictionaries[language][key], count = params?.count;
        const message = typeof count === 'number' ? catalog[`${key}.${plurals.select(count)}`] ?? base : base;
        return message.replace(/\{\{[^{}]+\}\}|\{([^{}]+)\}/g, (value, name) => name === undefined ? value : String(params?.[name] ?? value));
    }, { language });
}
const translators = { zh: createTranslator('zh'), en: createTranslator('en') };
export const translator = (language) => translators[language];

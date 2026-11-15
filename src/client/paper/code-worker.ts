import {createHighlighterCore} from 'shiki/core'
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript'
import light from 'shiki/themes/github-light.mjs'
import dark from 'shiki/themes/github-dark.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import jsx from 'shiki/langs/jsx.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import json from 'shiki/langs/json.mjs'
import python from 'shiki/langs/python.mjs'
import shellscript from 'shiki/langs/shellscript.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import html from 'shiki/langs/html.mjs'
import css from 'shiki/langs/css.mjs'
import sql from 'shiki/langs/sql.mjs'
import {highlightAllowed,codeLanguage} from './code-highlight.js'
const languages={javascript,typescript,jsx,tsx,json,python,shellscript,yaml,html,css,sql}
let instance:ReturnType<typeof createHighlighterCore>|undefined
let queue=Promise.resolve()
self.onmessage=(event:MessageEvent<{id:number;text:string;language:string;dark:boolean}>)=>{
  queue=queue.then(async()=>{
    const {id,text,language,dark:night}=event.data,lang=codeLanguage(language)
    try{
      if(!lang||!highlightAllowed(text)){self.postMessage({id,tokens:null});return}
      const highlighter=await(instance??=createHighlighterCore({themes:[light,dark],langs:[],engine:createJavaScriptRegexEngine()}))
      if(!highlighter.getLoadedLanguages().includes(lang))await highlighter.loadLanguage(languages[lang as keyof typeof languages])
      const tokens=highlighter.codeToTokens(text,{lang,theme:night?'github-dark':'github-light'}).tokens.map(line=>line.map(({content,color})=>({content,color})))
      self.postMessage({id,tokens})
    }catch{self.postMessage({id,tokens:null})}
  })
}

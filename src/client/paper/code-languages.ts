import {LanguageDescription,StreamLanguage,HighlightStyle,syntaxHighlighting} from '@codemirror/language'
import {tags} from '@lezer/highlight'
import {javascript} from '@codemirror/lang-javascript'
import {json} from '@codemirror/lang-json'
import {python} from '@codemirror/lang-python'
import {css} from '@codemirror/lang-css'
import {html} from '@codemirror/lang-html'
import {sql} from '@codemirror/lang-sql'
import {yaml} from '@codemirror/lang-yaml'
import {shell} from '@codemirror/legacy-modes/mode/shell'
export const codeLanguages=[
  LanguageDescription.of({name:'JavaScript',alias:['js','jsx'],support:javascript({jsx:true})}),
  LanguageDescription.of({name:'TypeScript',alias:['ts','tsx'],support:javascript({typescript:true,jsx:true})}),
  LanguageDescription.of({name:'JSON',support:json()}),LanguageDescription.of({name:'Python',alias:['py'],support:python()}),
  LanguageDescription.of({name:'CSS',support:css()}),LanguageDescription.of({name:'HTML',support:html()}),
  LanguageDescription.of({name:'SQL',support:sql()}),LanguageDescription.of({name:'YAML',alias:['yml'],support:yaml()}),
  LanguageDescription.of({name:'Shell',alias:['sh','bash','shellscript'],load:async()=>{const {LanguageSupport}=await import('@codemirror/language');return new LanguageSupport(StreamLanguage.define(shell))}})
]
export const codeHighlight=syntaxHighlighting(HighlightStyle.define([
  {tag:[tags.keyword,tags.operatorKeyword],color:'light-dark(#a626a4,#d5a0df)'},
  {tag:[tags.string,tags.regexp],color:'light-dark(#28734f,#92cfa5)'},
  {tag:[tags.number,tags.bool,tags.null],color:'light-dark(#986222,#e4b784)'},
  {tag:[tags.comment],color:'var(--muted)',fontStyle:'italic'},
  {tag:[tags.function(tags.variableName),tags.definition(tags.variableName)],color:'light-dark(#2565a9,#89b9ed)'},
  {tag:[tags.typeName,tags.className,tags.tagName],color:'light-dark(#9b4a24,#eaa381)'},
]))

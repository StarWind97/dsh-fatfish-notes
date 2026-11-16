import * as React from 'react'
import type {T} from './locale.js'
import {SettingsTabs,type SettingsCategory} from './SettingsTabs.js'
import {AppearanceStatus,AppearanceReset,appearanceTabs} from './paper/appearance.js'
import {SettingsPage} from './SettingsPage.js'
import {HandbookHelp} from './HandbookHelp.js'
import {FeedbackLink} from './FeedbackLink.js'

export function SettingsWorkspace({t,category,onCategory}:{t:T;category:SettingsCategory;onCategory:(value:SettingsCategory)=>void}){
  return <SettingsTabs heading="设置" value={category} onChange={onCategory} actions={category==='appearance'?<><AppearanceStatus/><AppearanceReset/></>:category==='reading'||category==='workspace'?<AppearanceStatus/>:undefined} items={[
    ...appearanceTabs(t),
    {id:'sync',label:'同步与存储',content:<SettingsPage t={t} grouped showFeedback={false}/>},
    {id:'help',label:'帮助',content:<><div className="settings-help"><HandbookHelp/></div><section className="settings-help"><strong>问题与建议</strong><p>反馈使用中遇到的问题，或提出改进建议。</p><FeedbackLink t={t}/></section></>}
  ]}/>
}

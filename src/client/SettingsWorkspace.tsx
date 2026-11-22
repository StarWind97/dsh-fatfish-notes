import * as React from 'react'
import type {T} from './locale.js'
import {SettingsTabs,type SettingsCategory} from './SettingsTabs.js'
import {AppearanceStatus,AppearanceReset,appearanceTabs} from './paper/appearance.js'
import {SettingsPage} from './SettingsPage.js'
import {HandbookHelp} from './HandbookHelp.js'
import {FeedbackLink} from './FeedbackLink.js'
import {BrandSignature} from './Brand.js'

export function SettingsWorkspace({t,category,onCategory}:{t:T;category:SettingsCategory;onCategory:(value:SettingsCategory)=>void}){
  return <SettingsTabs t={t} heading={t('notesSettings')} value={category} onChange={onCategory} actions={category==='appearance'?<><AppearanceStatus t={t}/><AppearanceReset t={t}/></>:category==='reading'||category==='workspace'?<AppearanceStatus t={t}/>:undefined} items={[
    ...appearanceTabs(t),
    {id:'sync',label:t('settingsSyncStorage'),content:<SettingsPage t={t} grouped showFeedback={false}/>},
    {id:'help',label:t('settingsHelp'),content:<><div className="settings-help"><HandbookHelp t={t}/></div><section className="settings-help"><strong>{t('feedback')}</strong><p>{t('settingsFeedbackHint')}</p><FeedbackLink t={t}/></section><footer className="settings-brand"><BrandSignature t={t}/></footer></>}
  ]}/>
}

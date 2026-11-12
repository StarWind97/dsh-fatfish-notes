import {StateEffect,StateField,Transaction} from '@codemirror/state'
import {invertedEffects} from '@codemirror/commands'
import type {NoteSupplements} from '../../contracts/notes.js'

// Move-to-body is one undoable action: text and supplemental membership travel together.
export const setSupplements=StateEffect.define<NoteSupplements>()
const patchSupplements=StateEffect.define<{add:NoteSupplements;remove:NoteSupplements}>()
export const supplementField=StateField.define<NoteSupplements>({
  create:()=>({assetIds:[],attachmentIds:[]}),
  update:(value,tr)=>tr.effects.reduce((value,e)=>{
    if(e.is(setSupplements))return e.value
    if(!e.is(patchSupplements))return value
    return {assetIds:[...new Set([...value.assetIds.filter(id=>!e.value.remove.assetIds.includes(id)),...e.value.add.assetIds])],attachmentIds:[...new Set([...value.attachmentIds.filter(id=>!e.value.remove.attachmentIds.includes(id)),...e.value.add.attachmentIds])]}
  },value),
})
export const supplementHistory=[supplementField,invertedEffects.of(tr=>{
  if(tr.annotation(Transaction.remote)||!tr.effects.some(e=>e.is(setSupplements)||e.is(patchSupplements)))return []
  const before=tr.startState.field(supplementField),after=tr.state.field(supplementField)
  const difference=(a:NoteSupplements,b:NoteSupplements)=>({assetIds:a.assetIds.filter(id=>!b.assetIds.includes(id)),attachmentIds:a.attachmentIds.filter(id=>!b.attachmentIds.includes(id))})
  // Undo only this action's membership changes, preserving files added independently later.
  return [patchSupplements.of({add:difference(before,after),remove:difference(after,before)})]
})]

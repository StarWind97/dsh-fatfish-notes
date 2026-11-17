import test from 'node:test'
import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fileURLToPath} from 'node:url'

test('Windows helper identifies exact app/profile and rejects ambiguous or foreign processes',{skip:process.platform!=='win32'},async()=>{
  const run=promisify(execFile)
  const result=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./fixtures/native-window.ps1',import.meta.url)),'-Source',fileURLToPath(new URL('../src/host/window-native.cs',import.meta.url))],{windowsHide:true,timeout:15000})
  assert.match(result.stdout,/native identity checks passed/)
})

import { relative } from 'node:path'
import { NotebookError } from '../domain/errors.js'
import type { Language } from '../domain/localization.js'
import { isRecord } from '../domain/record.js'
import type { PersonalBinding, PersonalPreview } from '../contracts/personal.js'
import { folderPath, type NotebookLocation } from './folder.js'

export interface Config {
  folder?: string
  locations?: NotebookLocation[]
  version: 1
  notesConsent: boolean
  notesAcknowledged: string | null
  enabled: boolean
  binding: PersonalBinding | null
  lastSuccessAt: string | null
  lastFailure?: { at: string; code: string }
  initializing: boolean
  handbookLanguage?: Language
  paused: {
    code: string
    message: string
  } | null
  preview: (PersonalPreview & {
    creationAttempted: boolean
    folderPrepared?: boolean
  }) | null
}

export const MANIFEST = 'notebook.json'
export const SCOPE = ['笔记和笔记本（含回收站）', '原始选材与归档图片']
export const PAUSE = new Set([
  'note_version',
  'note_sync_invalid',
  'personal_account_changed',
  'personal_repository_changed',
  'personal_repository_public',
  'personal_repository_unrelated',
  'unsupported_personal_version',
  'invalid_personal_data',
  'personal_data_limit',
  'personal_subscription_limit',
  'invalid_personal_manifest',
  'github_account_invalid',
  'github_repository_forbidden',
])

export function fail(code: string, message: string, status = 409): never {
  throw new NotebookError(code, message, status)
}

export function record(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!isRecord(input) || Object.keys(input).some(k => !allowed.includes(k))) {
    fail('invalid_request', '私人笔记请求格式无效', 400)
  }
  return input
}

export function account(input: unknown): input is PersonalBinding['account'] {
  return (
    isRecord(input) &&
    Object.keys(input).length === 2 &&
    typeof input.login === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(input.login) &&
    Number.isSafeInteger(input.id) &&
    Number(input.id) > 0
  )
}

export function binding(input: unknown): input is PersonalBinding {
  return (
    isRecord(input) &&
    Object.keys(input).length === 3 &&
    account(input.account) &&
    typeof input.repo === 'string' &&
    /^[a-zA-Z0-9_.-]{1,100}$/.test(input.repo) &&
    Number.isSafeInteger(input.repositoryId) &&
    Number(input.repositoryId) > 0
  )
}

export function locationOf(bound: PersonalBinding, folder: string): NotebookLocation {
  return { ownerId: bound.account.id, repositoryId: bound.repositoryId, folder }
}

export function remember(locations: NotebookLocation[] = [], current: NotebookLocation): NotebookLocation[] {
  return [...locations.filter(l => l.repositoryId !== current.repositoryId && relative(l.folder, current.folder) !== ''), current]
}

export function validateConfig(input: unknown, home: string): Config {
  if (
    !isRecord(input) ||
    input.version !== 1 ||
    typeof input.enabled !== 'boolean' ||
    typeof input.initializing !== 'boolean' ||
    (input.binding !== null && !binding(input.binding)) ||
    (input.lastSuccessAt !== null && (typeof input.lastSuccessAt !== 'string' || !Number.isFinite(Date.parse(input.lastSuccessAt)))) ||
    !Object.hasOwn(input, 'preview')
  ) {
    fail('personal_config_invalid', '笔记同步设置损坏；原文件已保留', 500)
  }
  if (
    input.lastFailure !== undefined &&
    (!isRecord(input.lastFailure) ||
      typeof input.lastFailure.at !== 'string' ||
      !Number.isFinite(Date.parse(input.lastFailure.at)) ||
      typeof input.lastFailure.code !== 'string' ||
      !/^[a-z_]{1,60}$/.test(input.lastFailure.code))
  ) {
    fail('personal_config_invalid', '本机同步诊断无效', 500)
  }
  if (input.handbookLanguage !== undefined && input.handbookLanguage !== 'zh' && input.handbookLanguage !== 'en') {
    fail('personal_config_invalid', '手册语言记录无效', 500)
  }
  if (input.preview !== null) {
    const p = input.preview
    if (isRecord(p) && p.folderPrepared !== undefined && typeof p.folderPrepared !== 'boolean') {
      fail('personal_config_invalid', '本机初始化记录无效', 500)
    }
    if (isRecord(p)) p.folder = folderPath(home, p.folder ?? home)
    if (
      !isRecord(p) ||
      typeof p.id !== 'string' ||
      !account(p.account) ||
      typeof p.repo !== 'string' ||
      !/^[a-zA-Z0-9_.-]{1,100}$/.test(p.repo) ||
      typeof p.exists !== 'boolean' ||
      (p.repositoryId !== null && (!Number.isSafeInteger(p.repositoryId) || Number(p.repositoryId) <= 0)) ||
      typeof p.creationAttempted !== 'boolean' ||
      !Array.isArray(p.dataScope) ||
      JSON.stringify(p.dataScope) !== JSON.stringify(SCOPE)
    ) {
      fail('personal_config_invalid', '笔记同步预览损坏；原文件已保留', 500)
    }
  }
  if (input.folder !== undefined) input.folder = folderPath(home, input.folder)
  if (input.locations !== undefined) {
    if (
      !Array.isArray(input.locations) ||
      input.locations.some(
        v =>
          !isRecord(v) ||
          !Number.isSafeInteger(v.ownerId) ||
          Number(v.ownerId) <= 0 ||
          !Number.isSafeInteger(v.repositoryId) ||
          Number(v.repositoryId) <= 0,
      )
    ) {
      fail('personal_config_invalid', '本机笔记库位置记录无效', 500)
    }
    for (const item of input.locations) item.folder = folderPath(home, item.folder)
  }
  if (
    input.paused !== undefined &&
    input.paused !== null &&
    (!isRecord(input.paused) || typeof input.paused.code !== 'string' || !PAUSE.has(input.paused.code) || typeof input.paused.message !== 'string' || input.paused.message.length > 500)
  ) {
    fail('personal_config_invalid', '笔记同步暂停状态无效；原文件已保留', 500)
  }
  if (
    (input.notesConsent !== undefined && typeof input.notesConsent !== 'boolean') ||
    (input.notesAcknowledged !== undefined && input.notesAcknowledged !== null && (typeof input.notesAcknowledged !== 'string' || !/^[a-f0-9]{64}$/.test(input.notesAcknowledged)))
  ) {
    fail('personal_config_invalid', '笔记同步设置无效；原文件已保留', 500)
  }
  return structuredClone({
    ...input,
    notesConsent: input.notesConsent ?? false,
    notesAcknowledged: input.notesAcknowledged ?? null,
    paused: input.paused ?? null,
  }) as unknown as Config
}

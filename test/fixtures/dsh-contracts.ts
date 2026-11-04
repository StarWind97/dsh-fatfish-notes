import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-client-locale'
import type {} from '@deepseek-ai/dsh-client-ui-slots'

// Resolve the official service augmentations. No local DSH module declarations.
export type HostContracts = Pick<Context, 'tools' | 'webServer'>
export type DefineTool = typeof import('@deepseek-ai/dsh-tools').defineTool
export type CredentialReference = ReturnType<typeof import('@deepseek-ai/dsh-credentials').credentialRef>

import path from 'node:path'
import os from 'node:os'
import { existsSync } from 'node:fs'
import { requireUuid } from './contracts.js'
import { platformOrigin } from './environment.js'
import type { WorkspaceIdentity } from './workspace.js'

export function defaultDataRoot(platform: string = process.platform, env: NodeJS.ProcessEnv = process.env): string {
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA
    if (!local || !path.win32.isAbsolute(local)) throw new Error('AGENT_DATA_ROOT_UNAVAILABLE')
    return path.win32.join(local, 'FutureStaff Agent')
  }
  return path.join(os.homedir(), '.local', 'share', 'futurestaff-agent')
}

export function memberDataDirectory(identity: WorkspaceIdentity, root = defaultDataRoot()): string {
  platformOrigin(identity.environment)
  if (!path.isAbsolute(root)) throw new Error('AGENT_DATA_ROOT_INVALID')
  const tenant = requireUuid({ id: identity.tenantId }, 'id').toLowerCase()
  const user = requireUuid({ id: identity.userId }, 'id').toLowerCase()
  return path.join(root, 'environments', identity.environment, 'tenants', tenant, 'users', user)
}

/** Existing member data wins: upgrades never silently abandon the old location. */
export function compatibleMemberDirectory(identity: WorkspaceIdentity): string {
  const legacy = path.join(os.homedir(), '.futurestaff', 'workspaces', identity.environment, identity.tenantId, 'users', identity.userId)
  const modern = memberDataDirectory(identity)
  return existsSync(legacy) ? legacy : modern
}

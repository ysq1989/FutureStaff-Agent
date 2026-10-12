/** Minimal context-isolated bridge for resolving operating-system drag payloads. */

import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { SYSTEM_VIEW_CHANNEL, type SystemViewRequest } from './system-view-contract.ts'
import { DESKTOP_FILE_PATH_BRIDGE } from './file-path-bridge-contract.ts'

contextBridge.exposeInMainWorld('futurestaffSystems', {
  request: (input: SystemViewRequest) => ipcRenderer.invoke(SYSTEM_VIEW_CHANNEL, input),
})

contextBridge.exposeInMainWorld(DESKTOP_FILE_PATH_BRIDGE, {
  /** Resolve only genuine disk-backed Web File objects selected by the operator. */
  getPathForFile(file: File): string {
    return webUtils.getPathForFile(file)
  },
})

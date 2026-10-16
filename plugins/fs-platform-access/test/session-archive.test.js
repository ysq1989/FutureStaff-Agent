import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createAgentBrowser } from '../lib/client/agents.js'

test('recent sessions expose archive only for visible authenticated sessions', () => {
  let snapshot = { phase: 'ready', activeTenantId: 'tenant', user: { userId: 'user' } }
  const Browser = createAgentBrowser({ subscribe: () => () => {}, getSnapshot: () => snapshot }, () => null)
  const props = {
    useSessions: select => select({ ids: ['visible', 'archived'], byId: {
      visible: { title: '保留记录' }, archived: { title: '已归档' },
    } }),
    useWorkspaces: select => select({ items: [], archivedSessionIds: ['archived'] }),
    open: () => {}, archiveSession: async () => {}, wide: true,
  }
  const html = renderToStaticMarkup(createElement(Browser, props))
  assert.match(html, /aria-label="归档会话：保留记录"/)
  assert.doesNotMatch(html, /归档会话：已归档/)
  snapshot = { phase: 'signed_out' }
  assert.doesNotMatch(renderToStaticMarkup(createElement(Browser, props)), /class="fs-agent-archive"/)
})

// ============================================================
//  EtherGlue — Platform Tester Integration Entry
// ============================================================

import { Game as EtherGlueGame } from './Game.js'
import { ConstructionPackPlugin } from './plugins/ConstructionPack.js'
import { UltimatePropsPackPlugin } from './plugins/UltimatePropsPack.js'

const MAX_TRIES = 120
const POLL_MS = 250

let tries = 0
let timer = null

function patchTroxTAdmin(glue) {
  const bridge = window.troxtAdmin || window.EtherWorldAdminBridge
  if (!bridge || bridge.__etherGluePatched) return
  const originalExecute = typeof bridge.execute === 'function' ? bridge.execute.bind(bridge) : null

  bridge.execute = (command, payload = {}) => {
    const text = String(command || '').trim()
    const first = text.split(/\s+/)[0]?.toLowerCase()
    if (['glue', 'etherglue', 'troxtmod', 'gmod'].includes(first)) {
      return executeGlueCommand(glue, text, payload)
    }
    return originalExecute ? originalExecute(command, payload) : null
  }

  bridge.etherGlue = glue
  bridge.__etherGluePatched = true
  glue.notify('Commandes TroxT/Admin branchées', 'success')
}

function executeGlueCommand(glue, command, payload = {}) {
  const parts = command.split(/\s+/).filter(Boolean)
  const action = (parts[1] || 'status').toLowerCase()

  if (action === 'status') return { success: true, status: glue.status() }
  if (action === 'props') return { success: true, props: glue.propFactory.list() }
  if (action === 'tools') return { success: true, tools: glue.tools.list() }
  if (action === 'tool') {
    const tool = parts[2] || payload.tool
    return { success: Boolean(glue.tools.use(tool)), status: glue.status() }
  }
  if (action === 'spawn') {
    const propId = parts[2] || payload.prop || 'crate'
    const hit = glue.raycastForward(6)
    const pos = hit?.point || glue.defaultSpawnPosition
    const record = glue.propFactory.create(propId, { position: pos, ...(payload.options || {}) })
    glue.selectObject(record.mesh)
    return { success: true, prop: record.id, status: glue.status() }
  }
  if (action === 'clear') {
    glue.propFactory.clear()
    glue.clearSelection()
    return { success: true, status: glue.status() }
  }
  if (action === 'save' || action === 'export') {
    const data = {
      generator: 'EtherGlue TroxTMOD',
      exportedAt: new Date().toISOString(),
      props: glue.propFactory.serialize(),
      status: glue.status()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `etherglue_props_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    return { success: true, exported: data.props.length }
  }

  return {
    success: true,
    status: glue.status(),
    commands: [
      'glue status',
      'glue props',
      'glue tools',
      'glue tool spawner|physgun|material|delete',
      'glue spawn crate',
      'glue clear',
      'glue export'
    ]
  }
}

function boot(sourceGame) {
  if (window.EtherGlue?.game) return window.EtherGlue.game

  const glue = new EtherGlueGame({ sourceGame })
  glue.plugins.use(ConstructionPackPlugin)
  glue.plugins.use(UltimatePropsPackPlugin)
  glue.ui.render()
  patchTroxTAdmin(glue)

  window.EtherGlue = {
    version: glue.version,
    game: glue,
    status: () => glue.status(),
    command: command => executeGlueCommand(glue, command),
    spawn: (prop, options) => glue.propFactory.create(prop, options),
    clear: () => glue.propFactory.clear()
  }

  window.dispatchEvent(new CustomEvent('etherworld:etherglue:ready', {
    detail: { version: glue.version, status: glue.status() }
  }))

  return glue
}

function waitForPlatformTester() {
  if (window.game?.scene && window.game?.camera && window.game?.renderer) {
    clearInterval(timer)
    timer = null
    boot(window.game)
    return
  }

  tries++
  if (tries >= MAX_TRIES) {
    clearInterval(timer)
    timer = null
    console.warn('[EtherGlue] Platform Tester non détecté. EtherGlue non démarré.')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    timer = setInterval(waitForPlatformTester, POLL_MS)
    waitForPlatformTester()
  }, { once: true })
} else {
  timer = setInterval(waitForPlatformTester, POLL_MS)
  waitForPlatformTester()
}

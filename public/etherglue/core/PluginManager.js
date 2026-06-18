// ============================================================
//  EtherGlue — PluginManager / TroxTMOD loader
// ============================================================

export class PluginManager {
  constructor(game) {
    this.game = game
    this.plugins = new Map()
    this.loadOrder = []
  }

  use(plugin, options = {}) {
    const descriptor = typeof plugin === 'function'
      ? plugin(this.game, options)
      : plugin?.install?.(this.game, options)

    const normalized = descriptor || plugin || {}
    const id = normalized.id || plugin.id || plugin.name || `plugin_${this.plugins.size + 1}`

    if (this.plugins.has(id)) return this.plugins.get(id)

    const record = {
      id,
      name: normalized.name || id,
      version: normalized.version || '1.0.0',
      description: normalized.description || '',
      dispose: normalized.dispose || null,
      installedAt: Date.now(),
      options
    }

    this.plugins.set(id, record)
    this.loadOrder.push(id)
    this.game.emit('plugin.loaded', record)
    return record
  }

  unload(id) {
    const plugin = this.plugins.get(id)
    if (!plugin) return false
    try { plugin.dispose?.() } catch (error) { console.warn('[EtherGlue Plugin unload]', error) }
    this.plugins.delete(id)
    this.loadOrder = this.loadOrder.filter(item => item !== id)
    this.game.emit('plugin.unloaded', { id })
    return true
  }

  list() {
    return this.loadOrder.map(id => this.plugins.get(id)).filter(Boolean)
  }
}

export default PluginManager

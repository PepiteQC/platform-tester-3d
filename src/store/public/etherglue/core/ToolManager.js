// ============================================================
//  EtherGlue — ToolManager
// ============================================================

export class ToolManager {
  constructor(game) {
    this.game = game
    this.tools = new Map()
    this.activeTool = null
    this.history = []
  }

  register(tool) {
    if (!tool?.id) throw new Error('Tool must have an id')
    tool.game = this.game
    this.tools.set(tool.id, tool)
    if (!this.activeTool) this.use(tool.id)
    this.game.emit('tool.registered', { id: tool.id, label: tool.label || tool.id })
    return tool
  }

  unregister(id) {
    const tool = this.tools.get(id)
    if (!tool) return false
    if (this.activeTool === tool) {
      tool.deactivate?.()
      this.activeTool = null
    }
    tool.dispose?.()
    this.tools.delete(id)
    this.game.emit('tool.unregistered', { id })
    return true
  }

  use(id) {
    const next = this.tools.get(id)
    if (!next) {
      this.game.notify?.(`Tool inconnu: ${id}`, 'warning')
      return null
    }
    if (this.activeTool === next) return next
    this.activeTool?.deactivate?.()
    this.activeTool = next
    next.activate?.()
    this.history.unshift({ id, timestamp: Date.now() })
    this.history = this.history.slice(0, 50)
    this.game.emit('tool.changed', { id, label: next.label || id })
    return next
  }

  cycle(direction = 1) {
    const list = Array.from(this.tools.keys())
    if (!list.length) return null
    const current = this.activeTool ? list.indexOf(this.activeTool.id) : -1
    const nextIndex = (current + direction + list.length) % list.length
    return this.use(list[nextIndex])
  }

  list() {
    return Array.from(this.tools.values()).map(tool => ({
      id: tool.id,
      label: tool.label || tool.id,
      description: tool.description || '',
      icon: tool.icon || '⬡'
    }))
  }

  handleMouseDown(button, event) {
    if (this.game.ui?.isEventInsideUI(event)) return
    this.activeTool?.onMouseDown?.(button, event)
  }

  handleMouseMove(event) {
    if (this.game.ui?.isEventInsideUI(event)) return
    this.activeTool?.onMouseMove?.(event)
  }

  handleMouseUp(button, event) {
    if (this.game.ui?.isEventInsideUI(event)) return
    this.activeTool?.onMouseUp?.(button, event)
  }

  handleKeyDown(event) {
    if (this.game.ui?.isTypingTarget(event.target)) return
    this.activeTool?.onKeyDown?.(event)
  }

  update(dt) {
    this.activeTool?.update?.(dt)
    for (const tool of this.tools.values()) tool.passiveUpdate?.(dt)
  }
}

export default ToolManager

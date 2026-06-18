// ============================================================
//  EtherGlue — EventEmitter
// ============================================================

export class EventEmitter {
  constructor() {
    this.listeners = new Map()
  }

  on(type, handler) {
    const list = this.listeners.get(type) || []
    list.push(handler)
    this.listeners.set(type, list)
    return () => this.off(type, handler)
  }

  once(type, handler) {
    const off = this.on(type, (...args) => {
      off()
      handler(...args)
    })
    return off
  }

  off(type, handler) {
    const list = this.listeners.get(type) || []
    this.listeners.set(type, list.filter(item => item !== handler))
  }

  emit(type, payload) {
    const event = {
      type,
      payload,
      timestamp: Date.now()
    }
    ;(this.listeners.get(type) || []).forEach(handler => {
      try { handler(event) } catch (error) { console.warn('[EtherGlue EventEmitter]', error) }
    })
    ;(this.listeners.get('*') || []).forEach(handler => {
      try { handler(event) } catch (error) { console.warn('[EtherGlue EventEmitter]', error) }
    })
    return event
  }

  clear() {
    this.listeners.clear()
  }
}

export default EventEmitter

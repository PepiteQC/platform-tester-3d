export type StoreListener<T> = (state: Readonly<T>) => void

export abstract class ObservableStore<T extends object> {
  protected state:T
  private readonly listeners = new Set<StoreListener<T>>()

  protected constructor(initialState:T) {
    this.state = initialState
  }

  subscribe(listener:StoreListener<T>):()=>void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  getState():Readonly<T> {
    return clone(this.state)
  }

  protected commit(next:T):void {
    this.state = next
    const snapshot = this.getState()
    this.listeners.forEach(listener => {
      try { listener(snapshot) } catch (error) { console.error('[ObservableStore] listener failed',error) }
    })
  }

  protected patch(patch:Partial<T>):void {
    this.commit({ ...this.state,...patch })
  }
}

export function clone<T>(value:T):T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T
}

export function uid(prefix:string):string {
  return `${prefix}_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`
}

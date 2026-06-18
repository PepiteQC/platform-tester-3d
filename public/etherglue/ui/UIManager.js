// ============================================================
//  EtherGlue — UIManager
// ============================================================

export class UIManager {
  constructor(game) {
    this.game = game
    this.root = null
    this.toolBar = null
    this.propBar = null
    this.inspector = null
    this.propSearch = null
    this.propCount = null
    this.groups = new Map()
    this.filter = ''
    this.visible = true
  }

  init() {
    this.injectStyles()
    this.root = document.createElement('section')
    this.root.id = 'etherglue-ui'
    this.root.className = 'etherglue-ui'
    this.root.innerHTML = `
      <div class="eg-head">
        <div><strong>EtherGlue</strong><span>TroxTMOD Runtime</span></div>
        <button type="button" data-eg-action="toggle">−</button>
      </div>
      <div class="eg-body">
        <div class="eg-section"><div class="eg-label">Tools</div><div class="eg-tools"></div></div>
        <div class="eg-section"><div class="eg-label">Props <span class="eg-prop-count"></span></div><input class="eg-search" type="search" placeholder="chercher un prop..." autocomplete="off"><div class="eg-props"></div></div>
        <div class="eg-section"><div class="eg-label">Inspector</div><div class="eg-inspector">Aucune sélection</div></div>
        <div class="eg-help">Q cycle tools · 1-9 props · M material · Del delete · G UI</div>
      </div>
    `
    document.body.appendChild(this.root)
    this.toolBar = this.root.querySelector('.eg-tools')
    this.propBar = this.root.querySelector('.eg-props')
    this.propSearch = this.root.querySelector('.eg-search')
    this.propCount = this.root.querySelector('.eg-prop-count')
    this.inspector = this.root.querySelector('.eg-inspector')

    this.propSearch?.addEventListener('input', () => {
      this.filter = this.propSearch.value.toLowerCase().trim()
      this.renderProps()
    })
    this.root.querySelector('[data-eg-action="toggle"]').addEventListener('click', () => this.toggleCollapsed())
    this.render()

    this.game.on('tool.changed', () => this.renderTools())
    this.game.on('prop.registered', () => this.renderProps())
    this.game.on('selection.changed', event => this.renderInspector(event.payload?.object || null))
    this.game.on('prop.created', () => this.renderInspector(this.game.selectedObject))
    this.game.on('prop.removed', () => this.renderInspector(this.game.selectedObject))
  }

  injectStyles() {
    if (document.getElementById('etherglue-ui-style')) return
    const style = document.createElement('style')
    style.id = 'etherglue-ui-style'
    style.textContent = `
      .etherglue-ui{position:fixed;top:64px;left:14px;width:270px;z-index:1500;color:#e8edf5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:rgba(5,8,16,.88);border:1px solid rgba(125,211,252,.25);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.45),0 0 35px rgba(125,211,252,.08);backdrop-filter:blur(14px);overflow:hidden}.eg-head{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(125,211,252,.12),rgba(201,168,76,.08))}.eg-head strong{display:block;color:#7dd3fc;font-size:13px;letter-spacing:1px;text-transform:uppercase}.eg-head span{display:block;color:#64748b;font-size:10px}.eg-head button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#dbeafe;border-radius:8px;width:26px;height:26px;cursor:pointer}.eg-body{padding:10px;display:flex;flex-direction:column;gap:10px}.etherglue-ui.is-collapsed .eg-body{display:none}.eg-label{font-size:10px;color:#c9a84c;text-transform:uppercase;letter-spacing:1.4px;font-weight:800;margin-bottom:6px}.eg-tools,.eg-props{display:flex;flex-wrap:wrap;gap:6px}.eg-props{max-height:310px;overflow:auto;padding-right:2px}.eg-search{width:100%;margin:0 0 8px;padding:8px 9px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(0,0,0,.25);color:#e8edf5;outline:none}.eg-prop-count{color:#64748b;font-weight:700}.eg-btn{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:#cbd5e1;border-radius:9px;padding:7px 8px;cursor:pointer;font-size:11px;display:flex;gap:5px;align-items:center}.eg-btn:hover{border-color:rgba(125,211,252,.45);color:#7dd3fc}.eg-btn.is-active{border-color:rgba(201,168,76,.65);background:rgba(201,168,76,.12);color:#ffe0a0}.eg-inspector{font-size:11px;line-height:1.55;color:#94a3b8;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:9px;background:rgba(0,0,0,.24)}.eg-inspector strong{color:#e8edf5}.eg-help{font-size:10px;color:#475569;line-height:1.5;border-top:1px solid rgba(255,255,255,.06);padding-top:8px}.etherglue-ui.is-hidden{display:none!important}
    `
    document.head.appendChild(style)
  }

  render() {
    this.renderTools()
    this.renderProps()
    this.renderInspector(this.game.selectedObject)
  }

  renderTools() {
    if (!this.toolBar) return
    this.toolBar.innerHTML = ''
    this.game.tools.list().forEach(tool => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `eg-btn ${this.game.tools.activeTool?.id === tool.id ? 'is-active' : ''}`
      btn.innerHTML = `<span>${tool.icon}</span>${tool.label}`
      btn.title = tool.description
      btn.addEventListener('click', () => this.game.tools.use(tool.id))
      this.toolBar.appendChild(btn)
    })
  }

  renderProps() {
    if (!this.propBar) return
    this.propBar.innerHTML = ''
    const all = this.game.propFactory.list()
    const filtered = this.filter
      ? all.filter(prop => `${prop.id} ${prop.label} ${prop.category} ${prop.description}`.toLowerCase().includes(this.filter))
      : all
    const visible = filtered.slice(0, this.filter ? 220 : 90)
    if (this.propCount) this.propCount.textContent = `(${filtered.length}/${all.length})`

    visible.forEach(prop => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'eg-btn'
      btn.innerHTML = `<span>${prop.icon}</span>${prop.label}`
      btn.title = `${prop.id}\n${prop.description}`
      btn.addEventListener('click', () => {
        this.game.tools.use('spawner')
        this.game.tools.activeTool?.setProp?.(prop.id)
      })
      this.propBar.appendChild(btn)
    })

    if (filtered.length > visible.length) {
      const note = document.createElement('div')
      note.style.cssText = 'width:100%;color:#64748b;font-size:10px;line-height:1.4;padding:6px 2px'
      note.textContent = `+${filtered.length - visible.length} props masqués — utilise la recherche.`
      this.propBar.appendChild(note)
    }
  }

  renderInspector(object) {
    if (!this.inspector) return
    if (!object) {
      this.inspector.textContent = 'Aucune sélection'
      return
    }
    const id = object.userData?.etherglueId || 'n/a'
    const prop = object.userData?.propId || object.name || 'mesh'
    const p = object.position
    this.inspector.innerHTML = `<strong>${prop}</strong><br>ID: ${id}<br>Pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
  }

  registerGroup(name, props) {
    this.groups.set(name, props)
  }

  registerButton(label, onClick) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'eg-btn'
    btn.textContent = label
    btn.addEventListener('click', onClick)
    this.propBar?.appendChild(btn)
    return btn
  }

  toggle() {
    this.visible = !this.visible
    this.root?.classList.toggle('is-hidden', !this.visible)
  }

  toggleCollapsed() {
    this.root?.classList.toggle('is-collapsed')
  }

  isEventInsideUI(event) {
    return Boolean(event?.target && this.root?.contains(event.target))
  }

  isTypingTarget(target) {
    if (!target) return false
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
  }
}

export default UIManager

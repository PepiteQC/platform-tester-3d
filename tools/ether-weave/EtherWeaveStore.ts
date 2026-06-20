import { eventBus } from '../../core/eventBus'
import { troxTBridge } from '../../core/troxt-bridge'
import { clone, ObservableStore, uid } from '../shared/ObservableStore'
import type { WeaveCanvas, WeaveLayer, WeavePattern, WeaveState, WeaveTile } from './types'

export class EtherWeaveStore extends ObservableStore<WeaveState> {
  constructor() { super({canvas:null,activeLayer:null,selectedPattern:null,isEditing:false,zoom:1}) }

  createCanvas(name:string,size:[number,number]):WeaveCanvas {
    const normalized:[number,number]=[clampDimension(size[0]),clampDimension(size[1])]
    const base:WeaveLayer={id:uid('layer'),name:'Base',tiles:[],opacity:1,blendMode:'normal',visible:true}
    const canvas:WeaveCanvas={id:uid('canvas'),name:name.trim()||'Untitled Texture',size:normalized,layers:[base],background:'#ffffff'}
    this.commit({canvas,activeLayer:base.id,selectedPattern:null,isEditing:true,zoom:1})
    this.publish('weave.canvas.created',{canvas})
    return clone(canvas)
  }

  addLayer(name:string):WeaveLayer {
    const canvas=this.requireCanvas()
    const layer:WeaveLayer={id:uid('layer'),name:name.trim()||`Layer ${canvas.layers.length+1}`,tiles:[],opacity:1,blendMode:'normal',visible:true}
    this.patch({canvas:{...canvas,layers:[...canvas.layers,layer]},activeLayer:layer.id,isEditing:true})
    this.publish('weave.layer.added',{canvasId:canvas.id,layer})
    return clone(layer)
  }

  updateLayer(id:string,patch:Partial<Omit<WeaveLayer,'id'|'tiles'>>):void {
    const canvas=this.requireCanvas()
    if (!canvas.layers.some(layer=>layer.id===id)) throw new Error(`Layer introuvable: ${id}`)
    this.patch({canvas:{...canvas,layers:canvas.layers.map(layer=>layer.id===id?{...layer,...patch}:layer)}})
    this.publish('weave.layer.updated',{layerId:id,patch})
  }

  removeLayer(id:string):boolean {
    const canvas=this.requireCanvas()
    if (canvas.layers.length===1) throw new Error('Le canvas doit conserver au moins un layer.')
    if (!canvas.layers.some(layer=>layer.id===id)) return false
    const layers=canvas.layers.filter(layer=>layer.id!==id)
    this.patch({canvas:{...canvas,layers},activeLayer:this.state.activeLayer===id?layers[0].id:this.state.activeLayer})
    this.publish('weave.layer.removed',{layerId:id})
    return true
  }

  placeTile(input:WeaveTile):WeaveTile {
    const canvas=this.requireCanvas()
    const layerId=this.state.activeLayer
    if (!layerId) throw new Error('Aucun layer actif.')
    const tile:WeaveTile={...clone(input),id:input.id||uid('tile'),rotation:normalizeRotation(input.rotation),scale:[Math.max(.01,input.scale[0]),Math.max(.01,input.scale[1])]}
    const layers=canvas.layers.map(layer=>layer.id===layerId?{...layer,tiles:[...layer.tiles,tile]}:layer)
    this.patch({canvas:{...canvas,layers},isEditing:true})
    this.publish('weave.tile.placed',{canvasId:canvas.id,layerId,tile})
    return clone(tile)
  }

  removeTile(tileId:string):boolean {
    const canvas=this.requireCanvas()
    let removed=false
    const layers=canvas.layers.map(layer=>{
      if (!layer.tiles.some(tile=>tile.id===tileId)) return layer
      removed=true
      return {...layer,tiles:layer.tiles.filter(tile=>tile.id!==tileId)}
    })
    if (removed) { this.patch({canvas:{...canvas,layers}}); this.publish('weave.tile.removed',{tileId}) }
    return removed
  }

  selectPattern(pattern:WeavePattern|null):void { this.patch({selectedPattern:pattern?clone(pattern):null}); this.publish('weave.pattern.selected',{patternId:pattern?.id ?? null}) }
  setActiveLayer(id:string):void { if(!this.requireCanvas().layers.some(layer=>layer.id===id)) throw new Error(`Layer introuvable: ${id}`); this.patch({activeLayer:id}) }
  setZoom(zoom:number):void { this.patch({zoom:Math.max(.1,Math.min(16,zoom))}) }

  async syncWithTroxT():Promise<void> {
    const canvas=this.requireCanvas()
    const payload={canvas:clone(canvas),activeLayer:this.state.activeLayer,selectedPattern:this.state.selectedPattern}
    troxTBridge.send({from:'ether-weave',to:'troxt',type:'weave.canvas.sync',payload})
    await eventBus.emitAsync('weave.synced','EtherWeaveStore',{canvasId:canvas.id,layerCount:canvas.layers.length})
  }

  private requireCanvas():WeaveCanvas { if(!this.state.canvas) throw new Error('Aucun canvas EtherWeave actif.'); return this.state.canvas }
  private publish(type:string,payload:unknown):void { eventBus.emit(type,'EtherWeaveStore',payload); troxTBridge.send({from:'ether-weave',to:'broadcast',type,payload}) }
}

function clampDimension(value:number) { return Math.max(1,Math.min(16384,Math.round(value||1))) }
function normalizeRotation(value:number) { return ((value%360)+360)%360 }
export default EtherWeaveStore

import { eventBus } from '../../core/eventBus'
import { troxTBridge } from '../../core/troxt-bridge'
import { clone, ObservableStore, uid } from '../shared/ObservableStore'
import type { LensDetection, LensMeasurement, LensReport, LensState, LensTarget } from './types'

export type LensAnalyzer = (target:LensTarget,signal:AbortSignal)=>Promise<{detections:LensDetection[];measurements?:LensMeasurement[];summary?:string}>

export class EtherLensStore extends ObservableStore<LensState> {
  private controller:AbortController|null=null
  constructor(private readonly analyzer:LensAnalyzer=basicAnalyzer) {
    super({isAnalyzing:false,target:null,detections:[],measurements:[],report:null,error:null})
  }

  setTarget(target:LensTarget):void {
    this.controller?.abort()
    this.commit({...this.state,target:clone(target),detections:[],measurements:[],report:null,error:null,isAnalyzing:false})
    this.publish('lens.target.changed',{type:target.type})
  }

  async analyze():Promise<void> {
    if (!this.state.target) throw new Error('Aucune cible EtherLens.')
    this.controller?.abort()
    this.controller=new AbortController()
    this.patch({isAnalyzing:true,error:null})
    try {
      const result=await this.analyzer(this.state.target,this.controller.signal)
      this.patch({detections:result.detections,measurements:result.measurements ?? this.state.measurements,isAnalyzing:false})
      this.publish('lens.analysis.completed',{detectionCount:result.detections.length,summary:result.summary})
    } catch(error) {
      if(this.controller.signal.aborted) return
      const message=error instanceof Error?error.message:String(error)
      this.patch({isAnalyzing:false,error:message})
      this.publish('lens.analysis.failed',{error:message})
      throw error
    }
  }

  addMeasurement(measurement:LensMeasurement):void {
    const normalized={...clone(measurement),id:measurement.id||uid('measure')}
    this.patch({measurements:[...this.state.measurements,normalized],report:null})
    this.publish('lens.measurement.added',normalized)
  }

  async generateReport():Promise<void> {
    if(!this.state.target) throw new Error('Aucune cible EtherLens.')
    const report:LensReport={
      id:uid('report'),target:clone(this.state.target),detections:clone(this.state.detections),measurements:clone(this.state.measurements),
      summary:buildSummary(this.state.detections,this.state.measurements),generatedAt:Date.now(),exportFormat:'json',
    }
    this.patch({report})
    this.publish('lens.report.generated',report)
    troxTBridge.send({from:'ether-lens',to:'troxt',type:'lens.report.ready',payload:report})
  }

  clear():void { this.controller?.abort(); this.commit({isAnalyzing:false,target:null,detections:[],measurements:[],report:null,error:null}) }

  private publish(type:string,payload:unknown):void { eventBus.emit(type,'EtherLensStore',payload); troxTBridge.send({from:'ether-lens',to:'broadcast',type,payload}) }
}

async function basicAnalyzer(target:LensTarget,signal:AbortSignal) {
  if(signal.aborted) throw signal.reason
  const metadata=typeof target.data==='object' && target.data!==null ? target.data as Record<string,unknown> : {}
  const width=Number(metadata.width ?? 0),height=Number(metadata.height ?? 0)
  const detections:LensDetection[]=[]
  if(width>0&&height>0) detections.push({id:uid('detect'),label:'image-boundary',confidence:1,bbox:[0,0,width,height],category:'geometry',metadata:{width,height,aspectRatio:width/height}})
  return {detections,summary:detections.length?'Dimensions détectées.':'Cible enregistrée; branchez TROXTVision pour la détection sémantique.'}
}
function buildSummary(detections:LensDetection[],measurements:LensMeasurement[]) {
  const labels=[...new Set(detections.map(item=>item.label))]
  return `${detections.length} détection(s), ${measurements.length} mesure(s).${labels.length?` Éléments: ${labels.join(', ')}.`:''}`
}
export default EtherLensStore

import { eventBus } from '../../core/eventBus'
import { troxTBridge } from '../../core/troxt-bridge'
import { ObservableStore, uid } from '../shared/ObservableStore'
import { etherAnalyzer } from './lib/etherAnalyzer'
import { prismGenerator } from './lib/prismGenerator'
import type { GenerationParams, PrismInput, PrismMode, PrismOutput, PrismState } from './types'

export class EtherPrismStore extends ObservableStore<PrismState> {
  private processing:Promise<void>|null=null
  private readonly modes=new WeakMap<object,PrismMode>()

  constructor() { super({isProcessing:false,queue:[],results:[],error:null}) }

  enqueue(input:PrismInput,mode:PrismMode='analyze'):void {
    if (!input || !input.type) throw new Error('PrismInput invalide.')
    if (typeof input==='object') this.modes.set(input as object,mode)
    this.patch({queue:[...this.state.queue,input],error:null})
    eventBus.emit('prism.queue.enqueued','EtherPrismStore',{mode,queueLength:this.state.queue.length})
  }

  async processQueue():Promise<void> {
    if (this.processing) return this.processing
    this.processing=this.drain().finally(()=>{this.processing=null})
    return this.processing
  }

  async analyze(input:PrismInput):Promise<PrismOutput> {
    const startedAt=performance.now()
    const result=await etherAnalyzer.analyze(input)
    const output:PrismOutput={id:uid('prism'),input,result,mode:'analyze',processedAt:Date.now(),duration:performance.now()-startedAt}
    this.patch({results:[output,...this.state.results].slice(0,200),error:null})
    this.publish('prism.analysis.completed',output)
    return output
  }

  async generate(params:GenerationParams):Promise<PrismOutput> {
    const output=await prismGenerator.generateFromPrompt(params)
    this.patch({results:[output,...this.state.results].slice(0,200),error:null})
    this.publish('prism.generation.completed',output)
    return output
  }

  async syncWithTroxT():Promise<void> {
    const payload={queueLength:this.state.queue.length,resultCount:this.state.results.length,lastResult:this.state.results[0] ?? null}
    troxTBridge.send({from:'ether-prism',to:'troxt',type:'prism.state.sync',payload})
    await eventBus.emitAsync('prism.synced','EtherPrismStore',payload)
  }

  clearResults():void { this.patch({results:[],error:null}) }

  private async drain():Promise<void> {
    this.patch({isProcessing:true,error:null})
    try {
      while (this.state.queue.length>0) {
        const [input,...rest]=this.state.queue
        this.patch({queue:rest})
        const mode=typeof input==='object' ? this.modes.get(input as object) ?? 'analyze' : 'analyze'
        if (mode==='analyze') await this.analyze(input)
        else throw new Error(`Mode ${mode} nécessite ses paramètres spécialisés et ne peut pas être traité comme PrismInput.`)
      }
    } catch (error) {
      const message=error instanceof Error?error.message:String(error)
      this.patch({error:message})
      this.publish('prism.queue.failed',{error:message})
      throw error
    } finally { this.patch({isProcessing:false}) }
  }

  private publish(type:string,payload:unknown):void {
    eventBus.emit(type,'EtherPrismStore',payload)
    troxTBridge.send({from:'ether-prism',to:'broadcast',type,payload})
  }
}

export default EtherPrismStore

import type { PrismInput } from '../types'

export interface LoadedImage { source:CanvasImageSource; width:number; height:number; format:string; byteSize:number; dispose():void }

export async function loadPrismImage(input:PrismInput):Promise<LoadedImage> {
  if(typeof document==='undefined') throw new Error('Le runtime image EtherPrism requiert un navigateur.')
  const blob=await inputToBlob(input)
  const format=blob.type.split('/')[1] || inferFormat(input)
  const byteSize=blob.size
  if('createImageBitmap' in window) {
    const bitmap=await createImageBitmap(blob)
    return {source:bitmap,width:bitmap.width,height:bitmap.height,format,byteSize,dispose:()=>bitmap.close()}
  }
  const url=URL.createObjectURL(blob)
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
    const element=new Image(); element.onload=()=>resolve(element); element.onerror=()=>reject(new Error('Image illisible.')); element.src=url
  })
  return {source:image,width:image.naturalWidth,height:image.naturalHeight,format,byteSize,dispose:()=>URL.revokeObjectURL(url)}
}

export function canvasFor(image:LoadedImage,maxWidth?:number,maxHeight?:number) {
  const ratio=Math.min(1,maxWidth?maxWidth/image.width:1,maxHeight?maxHeight/image.height:1)
  const width=Math.max(1,Math.round(image.width*ratio)),height=Math.max(1,Math.round(image.height*ratio))
  const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height
  const context=canvas.getContext('2d',{willReadFrequently:true}); if(!context) throw new Error('Canvas 2D indisponible.')
  context.drawImage(image.source,0,0,width,height)
  return {canvas,context,width,height}
}

export async function inputToBlob(input:PrismInput):Promise<Blob> {
  if(input.data instanceof Blob) return input.data
  if(input.type==='url' && typeof input.data==='string') {
    const response=await fetch(input.data); if(!response.ok) throw new Error(`Image HTTP ${response.status}`); return response.blob()
  }
  if((input.type==='base64'||input.type==='image') && typeof input.data==='string') {
    if(input.data.startsWith('data:')) return fetch(input.data).then(response=>response.blob())
    const binary=atob(input.data),bytes=new Uint8Array(binary.length)
    for(let index=0;index<binary.length;index+=1) bytes[index]=binary.charCodeAt(index)
    return new Blob([bytes],{type:String(input.metadata?.mimeType ?? 'image/png')})
  }
  if(input.data instanceof ArrayBuffer) return new Blob([input.data],{type:String(input.metadata?.mimeType ?? 'application/octet-stream')})
  if(ArrayBuffer.isView(input.data)) return new Blob([input.data.buffer.slice(input.data.byteOffset,input.data.byteOffset+input.data.byteLength)],{type:String(input.metadata?.mimeType ?? 'application/octet-stream')})
  throw new Error(`PrismInput ${input.type} non supporté.`)
}

export function toOutputInput(data:string,mimeType:string):PrismInput { return {type:'base64',data,metadata:{mimeType}} }
function inferFormat(input:PrismInput) { return String(input.metadata?.format ?? input.metadata?.mimeType ?? 'unknown').replace('image/','') }

export interface WeaveConfig { id:string; name:string; canvasSize:[number,number]; tileSize:[number,number]; seamless:boolean }
export type WeavePatternType='noise'|'voronoi'|'grid'|'brick'|'hex'|'custom'
export interface WeavePattern { id:string; name:string; type:WeavePatternType; params:Record<string,unknown>; preview?:string }
export interface WeaveTile { id:string; x:number; y:number; pattern:WeavePattern; rotation:number; scale:[number,number]; color:string }
export interface WeaveLayer { id:string; name:string; tiles:WeaveTile[]; opacity:number; blendMode:string; visible:boolean }
export interface WeaveCanvas { id:string; name:string; size:[number,number]; layers:WeaveLayer[]; background:string }
export interface WeaveExportOptions { format:'png'|'jpeg'|'webp'|'svg'; size:[number,number]; seamless:boolean; quality?:number }
export interface WeaveState { canvas:WeaveCanvas|null; activeLayer:string|null; selectedPattern:WeavePattern|null; isEditing:boolean; zoom:number }

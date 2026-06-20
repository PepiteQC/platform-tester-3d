// TROXT Vision Module - Image Understanding & Structure Analysis
// Proprietary ETHERWORLD Intelligence - Licensed under TROXT License 2024

export interface ImageAnalysis {
  subjects: string[];
  colors: string[];
  style: string;
  complexity: number;
  dimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  keyFeatures: string[];
  suggestedPrompt: string;
  confidence: number;
}

export class TROXTVisionEngine {
  static async analyzeImage(file: File): Promise<ImageAnalysis> {
    const canvas = await this.createCanvasFromFile(file);
    if (!canvas) throw new Error('Failed to load image');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imageData.data;

    return {
      subjects: await this.detectSubjects(pixelData, canvas),
      colors: this.detectDominantColors(pixelData),
      style: this.detectImageStyle(pixelData),
      complexity: this.analyzeComplexity(pixelData),
      dimensions: {
        width: canvas.width,
        height: canvas.height,
        aspectRatio: canvas.width / canvas.height,
      },
      keyFeatures: this.extractKeyFeatures(pixelData, canvas),
      suggestedPrompt: '',
      confidence: 0.75,
    };
  }

  private static createCanvasFromFile(file: File): Promise<HTMLCanvasElement | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas); }
          else resolve(null);
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private static async detectSubjects(pixelData: Uint8ClampedArray, canvas: HTMLCanvasElement): Promise<string[]> {
    const subjects: string[] = [];
    const edges = this.detectEdges(pixelData, canvas.width, canvas.height);
    const objectCount = this.countObjects(edges);
    if (objectCount > 5) subjects.push('complex scene', 'multiple objects');
    else if (objectCount > 1) subjects.push('scene');
    else subjects.push('object');
    if (this.hasWarmColors(pixelData)) subjects.push('warm-toned');
    if (this.hasCoolColors(pixelData)) subjects.push('cool-toned');
    if (this.hasHighContrast(pixelData)) subjects.push('high-contrast');
    return subjects.slice(0, 5);
  }

  private static detectEdges(pixelData: Uint8ClampedArray, width: number, height: number): number[][] {
    const edges: number[][] = [];
    const Gx = [[-1,0,1],[-2,0,2],[-1,0,1]];
    const Gy = [[-1,-2,-1],[0,0,0],[1,2,1]];
    for (let y = 1; y < height - 1; y++) {
      edges[y] = [];
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0, sumY = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y+dy)*width+(x+dx))*4;
            const gray = pixelData[idx]*0.299 + pixelData[idx+1]*0.587 + pixelData[idx+2]*0.114;
            sumX += Gx[dy+1][dx+1]*gray;
            sumY += Gy[dy+1][dx+1]*gray;
          }
        }
        edges[y][x] = Math.sqrt(sumX*sumX + sumY*sumY);
      }
    }
    return edges;
  }

  private static countObjects(edges: number[][]): number {
    let count = 0;
    const visited = new Set<string>();
    for (let y = 0; y < edges.length; y++) {
      if (!edges[y]) continue;
      for (let x = 0; x < edges[y].length; x++) {
        const key = `${x},${y}`;
        if (edges[y][x] > 50 && !visited.has(key)) {
          this.floodFill(edges, x, y, visited);
          count++;
        }
      }
    }
    return Math.max(1, Math.min(count, 10));
  }

  private static floodFill(edges: number[][], x: number, y: number, visited: Set<string>): void {
    const stack = [[x, y]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy}`;
      if (visited.has(key) || cy < 0 || cy >= edges.length || !edges[cy] || cx < 0 || cx >= edges[cy].length) continue;
      if (edges[cy][cx] <= 50) continue;
      visited.add(key);
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  }

  private static detectDominantColors(pixelData: Uint8ClampedArray): string[] {
    const colorMap = new Map<string, number>();
    for (let i = 0; i < pixelData.length; i += 16) {
      const r = Math.round(pixelData[i]/50)*50;
      const g = Math.round(pixelData[i+1]/50)*50;
      const b = Math.round(pixelData[i+2]/50)*50;
      const color = `rgb(${r},${g},${b})`;
      colorMap.set(color, (colorMap.get(color)||0)+1);
    }
    return Array.from(colorMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c])=>c);
  }

  private static detectImageStyle(pixelData: Uint8ClampedArray): string {
    const sat = this.calculateSaturation(pixelData);
    if (sat < 0.2) return 'monochrome';
    if (sat > 0.8) return 'vibrant';
    return 'balanced';
  }

  private static calculateSaturation(pixelData: Uint8ClampedArray): number {
    let totalSat = 0, samples = 0;
    for (let i = 0; i < pixelData.length; i += 16) {
      const r = pixelData[i]/255, g = pixelData[i+1]/255, b = pixelData[i+2]/255;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      totalSat += max === 0 ? 0 : (max-min)/max;
      samples++;
    }
    return totalSat / samples;
  }

  private static analyzeComplexity(pixelData: Uint8ClampedArray): number {
    let mean = 0;
    const count = pixelData.length / 4;
    for (let i = 0; i < pixelData.length; i += 4) {
      mean += pixelData[i]*0.299 + pixelData[i+1]*0.587 + pixelData[i+2]*0.114;
    }
    mean /= count;
    let variance = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
      const gray = pixelData[i]*0.299 + pixelData[i+1]*0.587 + pixelData[i+2]*0.114;
      variance += (gray-mean)**2;
    }
    variance /= count;
    return Math.min(1, Math.sqrt(variance)/128);
  }

  private static hasWarmColors(pixelData: Uint8ClampedArray): boolean {
    let warm = 0;
    for (let i = 0; i < pixelData.length; i += 16) if (pixelData[i] > pixelData[i+1]+20) warm++;
    return warm > pixelData.length/16/2;
  }

  private static hasCoolColors(pixelData: Uint8ClampedArray): boolean {
    let cool = 0;
    for (let i = 0; i < pixelData.length; i += 16) if (pixelData[i+2] > pixelData[i]+20) cool++;
    return cool > pixelData.length/16/2;
  }

  private static hasHighContrast(pixelData: Uint8ClampedArray): boolean {
    const values: number[] = [];
    for (let i = 0; i < pixelData.length; i += 4)
      values.push(pixelData[i]*0.299 + pixelData[i+1]*0.587 + pixelData[i+2]*0.114);
    values.sort((a,b)=>a-b);
    return values[Math.floor(values.length*0.9)] - values[Math.floor(values.length*0.1)] > 150;
  }

  private static extractKeyFeatures(pixelData: Uint8ClampedArray, canvas: HTMLCanvasElement): string[] {
    const features: string[] = [];
    if (this.hasHighContrast(pixelData)) features.push('high-contrast');
    if (this.hasWarmColors(pixelData)) features.push('warm-palette');
    if (this.hasCoolColors(pixelData)) features.push('cool-palette');
    const sat = this.calculateSaturation(pixelData);
    if (sat > 0.7) features.push('saturated');
    if (sat < 0.3) features.push('desaturated');
    if (canvas.width > canvas.height*1.5) features.push('wide-format');
    if (canvas.height > canvas.width*1.5) features.push('tall-format');
    return features;
  }
}
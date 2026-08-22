/**
 * Simple NPY (NumPy) file loader for JavaScript
 */
export class NpyLoader {
  static parse(arrayBuffer: ArrayBuffer): { data: Float32Array; shape: number[] } {
    if (arrayBuffer.byteLength < 10) {
      throw new Error(`File too short to be a valid NPY file (${arrayBuffer.byteLength} bytes)`);
    }

    const magic = new Uint8Array(arrayBuffer.slice(0, 16));
    const signature = [0x4E, 0x55, 0x4D, 0x50, 0x59]; // NUMPY
    
    let matchIndex = -1;
    for (let i = 0; i <= 5; i++) {
      let found = true;
      for (let j = 0; j < 5; j++) {
        if (magic[i + j] !== signature[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) {
      throw new Error(`Not a valid NPY file`);
    }

    const headerLenView = new DataView(arrayBuffer.slice(matchIndex + 7, matchIndex + 9));
    const headerLen = headerLenView.getUint16(0, true);

    const headerBytes = new Uint8Array(arrayBuffer.slice(matchIndex + 9, matchIndex + 9 + headerLen));
    const headerStr = new TextDecoder().decode(headerBytes);
    
    const shapeMatch = headerStr.match(/'shape':\s*\((\d+),\s*(\d+)\)/);
    if (!shapeMatch) {
      throw new Error('Could not parse shape from NPY header');
    }
    const shape = [parseInt(shapeMatch[1]), parseInt(shapeMatch[2])];

    const dataOffset = matchIndex + 9 + headerLen;
    const data = new Float32Array(arrayBuffer.slice(dataOffset));

    return { data, shape };
  }

  static async load(url: string): Promise<{ data: Float32Array; shape: number[] }> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return this.parse(arrayBuffer);
  }
}

/**
 * Utility for vector operations
 */
export class VectorOps {
  static cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

import fs from 'fs';
import path from 'path';

/**
 * Mock global fetch for Node environments to handle local data files
 */
if (typeof globalThis.fetch === 'undefined' || (typeof process !== 'undefined' && process.versions.node)) {
  const originalFetch = globalThis.fetch;

  (globalThis as any).fetch = async (url: string, init?: any) => {
    // If it's a relative URL starting with /
    if (url.startsWith('/')) {
      const publicPath = path.resolve(process.cwd(), 'public', url.substring(1));
      if (fs.existsSync(publicPath)) {
        const buffer = fs.readFileSync(publicPath);
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(buffer.toString()),
          arrayBuffer: async () => {
            const ab = new ArrayBuffer(buffer.length);
            const view = new Uint8Array(ab);
            for (let i = 0; i < buffer.length; ++i) {
              view[i] = buffer[i];
            }
            return ab;
          },
          text: async () => buffer.toString()
        };
      }
    }

    if (originalFetch) {
      return originalFetch(url, init);
    }
    
    throw new Error(`Fetch failed: ${url} (Node environment, no native fetch fallback)`);
  };
}

// Mock performance.now if needed (usually fine in Node)
if (typeof performance === 'undefined') {
    (globalThis as any).performance = {
        now: () => Date.now()
    };
}

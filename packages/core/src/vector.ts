/**
 * Minimal vector store interface with an in-memory implementation.
 * Production target is Postgres + pgvector behind the same interface.
 */

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface VectorHit {
  id: string;
  score: number;
}

export interface VectorStore {
  upsert(namespace: string, id: string, vector: number[]): void;
  get(namespace: string, id: string): number[] | undefined;
  topK(namespace: string, query: number[], k: number): VectorHit[];
  size(namespace: string): number;
}

export class InMemoryVectorStore implements VectorStore {
  private spaces = new Map<string, Map<string, number[]>>();

  upsert(namespace: string, id: string, vector: number[]): void {
    let space = this.spaces.get(namespace);
    if (!space) {
      space = new Map();
      this.spaces.set(namespace, space);
    }
    space.set(id, vector);
  }

  get(namespace: string, id: string): number[] | undefined {
    return this.spaces.get(namespace)?.get(id);
  }

  topK(namespace: string, query: number[], k: number): VectorHit[] {
    const space = this.spaces.get(namespace);
    if (!space) return [];
    const hits: VectorHit[] = [];
    for (const [id, vec] of space) hits.push({ id, score: cosine(query, vec) });
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, k);
  }

  size(namespace: string): number {
    return this.spaces.get(namespace)?.size ?? 0;
  }
}

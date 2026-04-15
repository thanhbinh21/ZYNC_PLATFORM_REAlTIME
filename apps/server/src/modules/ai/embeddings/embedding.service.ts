/**
 * Embedding Service – wraps Gemini `text-embedding-004`
 *
 * Produces 768-dimension float vectors for semantic search and RAG context.
 * Uses the Gemini embedding API via @google/generative-ai.
 */

import { getGeminiClient, AI_MODELS } from '../../../infrastructure/gemini';
import { getRedis } from '../../../infrastructure/redis';
import { logger } from '../../../shared/logger';

const EMBEDDING_CACHE_TTL = 30 * 60; // 30 minutes

export type EmbeddingVector = number[]; // 768 floats

/**
 * Compute a 768-dimension embedding for a single text.
 * Results are cached in Redis for 30 minutes to avoid redundant API calls.
 *
 * @param text    – the text to embed (max ~8K tokens)
 * @param taskType – Gemini task type hint (default: RETRIEVAL_DOCUMENT)
 */
export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' = 'RETRIEVAL_DOCUMENT',
): Promise<EmbeddingVector> {
  const cacheKey = buildCacheKey(text, taskType);

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = await tryGetCache(cacheKey);
  if (cached) return cached;

  // ── Gemini API call ────────────────────────────────────────────────────────
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: AI_MODELS.EMBEDDING });

  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
  });

  const vector = result.embedding.values;

  if (vector.length !== 768) {
    logger.warn('[EmbeddingService] Unexpected embedding dimension', { dimension: vector.length });
  }

  // ── Cache result ───────────────────────────────────────────────────────────
  await trySetCache(cacheKey, vector);

  return vector;
}

/**
 * Batch-embed multiple texts.
 * Processes sequentially to respect Gemini free-tier rate limits (15 RPM).
 * Inserts a 200ms delay between requests when > 5 items.
 */
export async function embedBatch(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT',
): Promise<EmbeddingVector[]> {
  const results: EmbeddingVector[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) continue;
    results.push(await embedText(text, taskType));

    // Gentle rate-limit guard for batch operations
    if (texts.length > 5 && i < texts.length - 1) {
      await sleep(200);
    }
  }

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCacheKey(text: string, taskType: string): string {
  // Simple key using first 200 chars + task type (good enough for cache hit)
  const slug = text.slice(0, 200).replace(/\s+/g, '_');
  return `embed:${taskType}:${slug}`;
}

async function tryGetCache(key: string): Promise<EmbeddingVector | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(key);
    if (raw) {
      return JSON.parse(raw) as EmbeddingVector;
    }
  } catch (err) {
    logger.debug('[EmbeddingService] Cache get failed', { err: String(err) });
  }
  return null;
}

async function trySetCache(key: string, vector: EmbeddingVector): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, EMBEDDING_CACHE_TTL, JSON.stringify(vector));
  } catch (err) {
    logger.debug('[EmbeddingService] Cache set failed', { err: String(err) });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

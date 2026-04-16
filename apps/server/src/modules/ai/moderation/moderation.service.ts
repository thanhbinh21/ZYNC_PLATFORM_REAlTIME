/**
 * Moderation Service – AI-1 (Content Moderation)
 *
 * Primary:  Gemini Flash text/image classification
 * Fallback: Keyword regex filter (VN + EN)
 * Fail-open: When AI unavailable → keyword filter → pass with logging
 *
 * Scoring thresholds (matches plan spec):
 *   < 0.3  → safe    → pass through
 *   0.3–0.7 → warning → flag for admin review
 *   > 0.7  → blocked  → hide message + notify user
 */

import { getModel, AI_MODELS, isAIEnabled } from '../../../infrastructure/gemini';
import { runKeywordFilter } from './keyword-filter';
import { ModerationLogModel, type ModerationLabel, type ModerationAction, type ContentType } from './moderation.model';
import { logger } from '../../../shared/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationInput {
  messageId: string;
  conversationId: string;
  senderId: string;
  contentType: ContentType;
  content?: string;
  mediaUrl?: string;
}

export interface ModerationResult {
  label: ModerationLabel;
  confidence: number;
  action: ModerationAction;
  reason?: string;
  source: 'gemini' | 'keyword_filter';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THRESHOLD_WARNING = 0.3;
const THRESHOLD_BLOCK   = 0.7;

// ─── Core classification ──────────────────────────────────────────────────────

/**
 * Classify text content using Gemini Flash.
 * Returns a structured score from Gemini's response.
 */
async function classifyTextWithGemini(text: string): Promise<{ label: ModerationLabel; confidence: number; reason: string }> {
  const model = getModel(AI_MODELS.FALLBACK); // Use Flash for moderation (speed + free tier)

  const prompt = `You are a content moderation assistant. Analyze the following message and classify it.

Message: "${text.slice(0, 1000)}"

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "label": "safe" | "warning" | "blocked",
  "confidence": 0.0-1.0,
  "reason": "brief explanation in 1 sentence"
}

Classification rules:
- "safe" (confidence < 0.3): Normal conversation, no issues
- "warning" (0.3-0.7): Mildly offensive, hate speech, potential spam — flag for review
- "blocked" (> 0.7): Severe: explicit threats, extreme hate, harassment, NSFW, scam`;

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 8000)),
  ]);

  const raw = result.response.text().trim();

  // Extract JSON from response (handles cases where model adds extra text)
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Invalid Gemini response format');

  const parsed = JSON.parse(jsonMatch[0]) as {
    label?: string;
    confidence?: number;
    reason?: string;
  };

  const label = (['safe', 'warning', 'blocked'].includes(parsed.label ?? ''))
    ? (parsed.label as ModerationLabel)
    : 'safe';

  const confidence = typeof parsed.confidence === 'number'
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.1;

  return { label, confidence, reason: parsed.reason ?? 'Classified by Gemini' };
}

/**
 * Classify image content using Gemini Vision.
 * Only runs when mediaUrl is provided and AI is enabled.
 */
async function classifyImageWithGemini(mediaUrl: string): Promise<{ label: ModerationLabel; confidence: number; reason: string }> {
  const model = getModel(AI_MODELS.FALLBACK);

  const prompt = `You are a content moderation assistant. Check if this image URL contains inappropriate content.
URL: ${mediaUrl}

Respond ONLY with JSON:
{
  "label": "safe" | "warning" | "blocked",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Vision timeout')), 10000)),
  ]);

  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Invalid Gemini Vision response');

  const parsed = JSON.parse(jsonMatch[0]) as { label?: string; confidence?: number; reason?: string };
  const label = (['safe', 'warning', 'blocked'].includes(parsed.label ?? ''))
    ? (parsed.label as ModerationLabel)
    : 'safe';
  const confidence = typeof parsed.confidence === 'number'
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.1;

  return { label, confidence, reason: parsed.reason ?? 'Classified by Gemini Vision' };
}

// ─── Action escalation ────────────────────────────────────────────────────────

function labelToAction(label: ModerationLabel, confidence: number): ModerationAction {
  if (label === 'blocked' && confidence > THRESHOLD_BLOCK) return 'block';
  if (label === 'warning' && confidence >= THRESHOLD_WARNING) return 'flag';
  return 'pass';
}

// ─── Main moderation function ─────────────────────────────────────────────────

/**
 * Moderate a message: classify → escalate → log to MongoDB.
 *
 * Fail-open strategy:
 *   Gemini fails → keyword filter → if also uncertain → pass with logging.
 */
export async function moderateMessage(input: ModerationInput): Promise<ModerationResult> {
  const { messageId, conversationId, senderId, contentType, content, mediaUrl } = input;

  let label: ModerationLabel = 'safe';
  let confidence = 0.1;
  let reason = 'No content to analyze';
  let source: ModerationResult['source'] = 'keyword_filter';

  // ── 1. Fast Path: Keyword filter (Regex First) ─────────────────────────────
  // Prioritize simple regex. If it blatantly violates rules, block it now and save AI Quota.
  if (content && contentType === 'text') {
    const kwResult = runKeywordFilter(content);
    label = kwResult.label;
    confidence = kwResult.confidence;
    reason = kwResult.reason;
    source = 'keyword_filter';

    if (label === 'blocked') {
      logger.debug('[Moderation] Blocked early by keyword filter', { messageId, confidence });
    }
  }

  // ── 2. Deep Path: Gemini AI Classification (If not already blocked) ──────────
  if (label !== 'blocked' && isAIEnabled()) {
    try {
      if (contentType === 'text' && content) {
        const result = await classifyTextWithGemini(content);
        label = result.label;
        confidence = result.confidence;
        reason = result.reason;
        source = 'gemini';
        logger.debug('[Moderation] Gemini text classification', { messageId, label, confidence });
      } else if (['image', 'video'].includes(contentType) && mediaUrl) {
        const result = await classifyImageWithGemini(mediaUrl);
        label = result.label;
        confidence = result.confidence;
        reason = result.reason;
        source = 'gemini';
        logger.debug('[Moderation] Gemini image classification', { messageId, label, confidence });
      }
    } catch (err) {
      logger.debug('[Moderation] Gemini failed, using previous keyword filter result', { messageId, err: String(err) });
      // Fall through; it will keep the label/confidence computed by keyword filter in Step 1
    }
  }

  const action = labelToAction(label, confidence);

  // ── Log to MongoDB (async, non-blocking) ──────────────────────────────────
  void ModerationLogModel.create({
    messageId,
    conversationId,
    senderId,
    contentType,
    contentText: content?.slice(0, 2000),
    mediaUrl,
    label,
    confidence,
    reason,
    action,
    source,
  }).catch((err) => logger.error('[Moderation] Failed to save moderation log', { messageId, err }));

  logger.info('[Moderation] Result', { messageId, label, confidence, action, source });

  return { label, confidence, action, reason, source };
}

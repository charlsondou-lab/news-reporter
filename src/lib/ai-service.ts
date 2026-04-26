import { dbQuery } from './db';
import type { UserPreference } from './supabase';

interface AIClassification {
  title_tc: string;
  title_en: string;
  summary_tc: string;
  summary_en: string;
  content_tc: string;
  category: string;
  score: number;
  score_reasoning: string;
}

interface AIFeedbackAnalysis {
  analysis: string;
  learned_pattern: string;
  keywords_liked: string[];
  keywords_disliked: string[];
  topic_preference: string;
}

function getOpenRouterConfig() {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
    siteName: process.env.OPENROUTER_SITE_NAME || 'News Reporter',
  };
}

function extractJSON(str: string): string {
  const cleaned = str.replace(/```json\n?|```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return cleaned.slice(first, last + 1);
  }
  return cleaned;
}

async function callOpenRouterWithRetry(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 3,
): Promise<string> {
  const config = getOpenRouterConfig();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://news-reporter.local',
          'X-Title': config.siteName,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter API error: ${res.status} ${text}`);
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI returned empty content');
      }
      return content;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
}

async function loadUserPreferences(): Promise<string> {
  const result = await dbQuery<UserPreference>(
    'SELECT * FROM user_preferences ORDER BY created_at DESC LIMIT 50',
  );

  const prefs = result.rows;
  if (prefs.length === 0) {
    return 'No prior user preference records.';
  }

  return prefs
    .map((p: UserPreference) => {
      const direction = p.score_diff > 0 ? 'user score higher than AI' : 'user score lower than AI';
      return `category=${p.article_category}, ai_score=${p.ai_score}, user_score=${p.user_score}, trend=${direction}, note=${p.learned_pattern || p.user_comment || ''}`;
    })
    .join('\n');
}

export async function classifyAndScoreArticle(
  title: string,
  content: string,
  feedTitle: string,
): Promise<AIClassification> {
  const preferences = await loadUserPreferences();

  const systemPrompt = `Return strict JSON only with keys:
title_tc, title_en, summary_tc, summary_en, content_tc, category, score, score_reasoning.
Categories must be one of: ai, tools, tech, security, automation, future, mindset, solopreneur, finance, crypto, marketing, growth, design, life, other.
Use Traditional Chinese for *_tc fields.`;

  const userPrompt = `Source: ${feedTitle}
Title: ${title}
Preferences:
${preferences}
Content:
${content.slice(0, 6000)}`;

  try {
    const response = await callOpenRouterWithRetry(systemPrompt, userPrompt);
    const parsed = JSON.parse(extractJSON(response)) as Partial<AIClassification> & { score?: number | string };

    return {
      title_tc: parsed.title_tc || title,
      title_en: parsed.title_en || title,
      summary_tc: parsed.summary_tc || '',
      summary_en: parsed.summary_en || '',
      content_tc: parsed.content_tc || '',
      category: parsed.category || 'other',
      score: Math.min(10, Math.max(1, parseInt(String(parsed.score ?? 5), 10))),
      score_reasoning: parsed.score_reasoning || '',
    };
  } catch (error) {
    console.error('[AI] Classification failed:', error);
    return {
      title_tc: title,
      title_en: title,
      summary_tc: 'AI 分析失敗',
      summary_en: '(AI analysis failed)',
      content_tc: '',
      category: 'other',
      score: 5,
      score_reasoning: 'AI analysis failed',
    };
  }
}

export async function analyzeFeedbackDifference(
  articleTitle: string,
  articleContent: string,
  articleCategory: string,
  aiScore: number,
  userScore: number,
  userComment: string,
): Promise<AIFeedbackAnalysis> {
  const systemPrompt = `Return strict JSON only:
analysis, learned_pattern, keywords_liked, keywords_disliked, topic_preference.`;

  const userPrompt = `Title: ${articleTitle}
Category: ${articleCategory}
AI Score: ${aiScore}
User Score: ${userScore}
Comment: ${userComment || '(none)'}
Content:
${articleContent.slice(0, 3000)}`;

  try {
    const response = await callOpenRouterWithRetry(systemPrompt, userPrompt);
    const parsed = JSON.parse(extractJSON(response)) as Partial<AIFeedbackAnalysis>;

    return {
      analysis: parsed.analysis || '',
      learned_pattern: parsed.learned_pattern || '',
      keywords_liked: parsed.keywords_liked || [],
      keywords_disliked: parsed.keywords_disliked || [],
      topic_preference: parsed.topic_preference || '',
    };
  } catch (error) {
    console.error('[AI] Feedback analysis failed:', error);
    return {
      analysis: 'AI feedback analysis failed',
      learned_pattern: '',
      keywords_liked: [],
      keywords_disliked: [],
      topic_preference: '',
    };
  }
}

export type { AIClassification, AIFeedbackAnalysis };

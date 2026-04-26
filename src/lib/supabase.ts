// Legacy file kept for shared app types.
// Supabase runtime client has been replaced by direct PostgreSQL queries.

export interface Article {
  id: string;
  ttrss_article_id: number;
  title: string;
  link: string | null;
  author: string | null;
  feed_title: string | null;
  published_at: string | null;
  content_html: string | null;
  content_markdown: string | null;
  ai_title: string | null;
  ai_summary: string | null;
  ai_title_tc: string | null;
  ai_title_en: string | null;
  ai_summary_tc: string | null;
  ai_summary_en: string | null;
  ai_content_tc: string | null;
  ai_category: string;
  ai_score: number;
  ai_score_reasoning: string | null;
  metadata: Record<string, unknown>;
  user_score: number | null;
  user_comment: string | null;
  is_read: boolean;
  is_bookmarked: boolean;
  is_hidden: boolean;
  ai_feedback_analysis: string | null;
  fetched_at: string;
  read_at: string | null;
  scored_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface UserPreference {
  id: string;
  article_id: string;
  ai_score: number;
  user_score: number;
  score_diff: number;
  user_comment: string | null;
  ai_analysis: string | null;
  learned_pattern: string | null;
  article_category: string | null;
  article_feed: string | null;
  learning_data: Record<string, unknown>;
  created_at: string;
}


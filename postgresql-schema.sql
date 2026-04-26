-- =============================================
-- News Reporter - PostgreSQL Schema
-- Idempotent: safe to run multiple times
-- =============================================

SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Categories =====
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (id, label, description, icon, color, sort_order)
VALUES
  ('ai',          'AI',          'Artificial intelligence and LLM updates',               'brain',         '#8B5CF6', 1),
  ('tools',       'Tools',       'SaaS and productivity tools',                            'wrench',        '#3B82F6', 2),
  ('automation',  'Automation',  'Automation workflows and no-code systems',               'bot',           '#7C3AED', 3),
  ('tech',        'Tech',        'General technology news',                                'cpu',           '#10B981', 4),
  ('security',    'Security',    'Cybersecurity and risk topics',                          'shield',        '#14B8A6', 5),
  ('future',      'Future',      'Future trends and emerging topics',                      'sparkles',      '#F43F5E', 6),
  ('mindset',     'Mindset',     'Thinking models and strategy',                           'lightbulb',     '#F59E0B', 7),
  ('solopreneur', 'Solopreneur', 'Indie builder and solo business content',                'user',          '#6366F1', 8),
  ('finance',     'Finance',     'Finance and macro market updates',                        'line-chart',    '#EF4444', 9),
  ('crypto',      'Crypto',      'Crypto and Web3 topics',                                 'coins',         '#FACC15', 10),
  ('marketing',   'Marketing',   'Marketing and distribution tactics',                      'megaphone',     '#EC4899', 11),
  ('growth',      'Growth',      'Growth experiments and playbooks',                        'trending-up',   '#D946EF', 12),
  ('design',      'Design',      'UI, UX, and product design',                             'palette',       '#F97316', 13),
  ('life',        'Life',        'Lifestyle and creator life',                              'heart',         '#84CC16', 14),
  ('other',       'Other',       'Unclassified content',                                    'circle',        '#6B7280', 99)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- ===== Articles =====
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- TTRSS source metadata
  ttrss_article_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  link TEXT,
  author TEXT,
  feed_title TEXT,
  published_at TIMESTAMPTZ,

  -- Raw content
  content_html TEXT,
  content_markdown TEXT,

  -- AI output
  ai_title TEXT,
  ai_summary TEXT,
  ai_title_tc TEXT,
  ai_title_en TEXT,
  ai_summary_tc TEXT,
  ai_summary_en TEXT,
  ai_content_tc TEXT,
  ai_category TEXT NOT NULL DEFAULT 'other' REFERENCES categories(id),
  ai_score INTEGER NOT NULL DEFAULT 5 CHECK (ai_score BETWEEN 1 AND 10),
  ai_score_reasoning TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  -- User interaction
  user_score INTEGER CHECK (user_score IS NULL OR (user_score BETWEEN 1 AND 10)),
  user_comment TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  ai_feedback_analysis TEXT,

  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_ttrss_id ON articles (ttrss_article_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (ai_category);
CREATE INDEX IF NOT EXISTS idx_articles_ai_score ON articles (ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles (is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_hidden ON articles (is_hidden);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_metadata ON articles USING GIN (metadata);

-- ===== Updated timestamp trigger =====
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.articles') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE t.tgname = 'articles_updated_at'
        AND c.relname = 'articles'
        AND n.nspname = 'public'
        AND NOT t.tgisinternal
    ) THEN
      EXECUTE 'DROP TRIGGER articles_updated_at ON public.articles';
    END IF;

    EXECUTE 'CREATE TRIGGER articles_updated_at
      BEFORE UPDATE ON public.articles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at()';
  END IF;
END $$;

-- ===== User preference learning =====
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  ai_score INTEGER NOT NULL,
  user_score INTEGER NOT NULL,
  score_diff INTEGER GENERATED ALWAYS AS (user_score - ai_score) STORED,

  user_comment TEXT,
  ai_analysis TEXT,
  learned_pattern TEXT,
  article_category TEXT,
  article_feed TEXT,
  learning_data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferences_article ON user_preferences (article_id);
CREATE INDEX IF NOT EXISTS idx_preferences_diff ON user_preferences (score_diff);
CREATE INDEX IF NOT EXISTS idx_preferences_learning ON user_preferences USING GIN (learning_data);

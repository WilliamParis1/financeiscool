-- Homepage posts that explain a card through a finance/news story.
-- Run this migration in Supabase SQL Editor if your database was created
-- before the homepage journal feature existed.

CREATE TABLE IF NOT EXISTS public.card_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  news_source TEXT,
  market_summary TEXT,
  explanation TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.card_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_posts_select" ON public.card_posts;
DROP POLICY IF EXISTS "card_posts_insert" ON public.card_posts;
DROP POLICY IF EXISTS "card_posts_update" ON public.card_posts;
DROP POLICY IF EXISTS "card_posts_delete" ON public.card_posts;

CREATE POLICY "card_posts_select" ON public.card_posts FOR SELECT USING (
  is_published = true OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "card_posts_insert" ON public.card_posts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "card_posts_update" ON public.card_posts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "card_posts_delete" ON public.card_posts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admin-managed card tag catalog with colors.

CREATE TABLE IF NOT EXISTS public.card_tags (
  name TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT '#c9a24b',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT card_tags_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

INSERT INTO public.card_tags (name, color)
VALUES
  ('News May 2026', '#2563eb'),
  ('CFA Level 1', '#c9a24b'),
  ('Python', '#16a34a'),
  ('French history', '#dc2626')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_tag_names_allowed;

ALTER TABLE public.card_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_tags_select" ON public.card_tags;
DROP POLICY IF EXISTS "card_tags_insert" ON public.card_tags;
DROP POLICY IF EXISTS "card_tags_update" ON public.card_tags;
DROP POLICY IF EXISTS "card_tags_delete" ON public.card_tags;

CREATE POLICY "card_tags_select" ON public.card_tags FOR SELECT USING (true);

CREATE POLICY "card_tags_insert" ON public.card_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "card_tags_update" ON public.card_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "card_tags_delete" ON public.card_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

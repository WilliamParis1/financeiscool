-- Admin-managed card tags and card-specific date list.

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS tag_names TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS card_dates DATE[] NOT NULL DEFAULT '{}';

ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_tag_names_allowed;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_tag_names_allowed
  CHECK (
    tag_names <@ ARRAY[
      'News May 2026',
      'CFA Level 1',
      'Python',
      'French history'
    ]::TEXT[]
  );

DROP FUNCTION IF EXISTS public.admin_update_card_settings(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.admin_update_card_settings(
  target_card_id UUID,
  new_rarity TEXT DEFAULT NULL,
  new_rarity_weight INTEGER DEFAULT NULL,
  new_tag_names TEXT[] DEFAULT NULL,
  new_card_dates DATE[] DEFAULT NULL
)
RETURNS public.cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_card public.cards;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can update card settings'
      USING ERRCODE = '42501';
  END IF;

  IF new_rarity IS NOT NULL
     AND new_rarity NOT IN ('common', 'rare', 'legendary') THEN
    RAISE EXCEPTION 'Invalid rarity: %', new_rarity
      USING ERRCODE = '22023';
  END IF;

  IF new_rarity_weight IS NOT NULL AND new_rarity_weight < 0 THEN
    RAISE EXCEPTION 'Rarity weight must be zero or greater'
      USING ERRCODE = '22023';
  END IF;

  IF new_tag_names IS NOT NULL
     AND NOT (
      new_tag_names <@ ARRAY[
        'News May 2026',
        'CFA Level 1',
        'Python',
        'French history'
      ]::TEXT[]
    ) THEN
    RAISE EXCEPTION 'Invalid card tag'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.cards
  SET
    rarity = COALESCE(new_rarity, rarity),
    rarity_weight = COALESCE(new_rarity_weight, rarity_weight),
    tag_names = COALESCE(new_tag_names, tag_names),
    card_dates = COALESCE(new_card_dates, card_dates)
  WHERE id = target_card_id
  RETURNING * INTO updated_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN updated_card;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_card_settings(UUID, TEXT, INTEGER, TEXT[], DATE[]) TO authenticated;

-- Make admin card setting updates reliable from the client.
-- This keeps user inventories normalized: user_cards points at cards.id, so
-- changing one cards row updates every owned copy of that card everywhere.

CREATE OR REPLACE FUNCTION public.admin_update_card_settings(
  target_card_id UUID,
  new_rarity TEXT DEFAULT NULL,
  new_rarity_weight INTEGER DEFAULT NULL
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

  UPDATE public.cards
  SET
    rarity = COALESCE(new_rarity, rarity),
    rarity_weight = COALESCE(new_rarity_weight, rarity_weight)
  WHERE id = target_card_id
  RETURNING * INTO updated_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN updated_card;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_card_settings(UUID, TEXT, INTEGER) TO authenticated;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cards_update" ON public.cards;
CREATE POLICY "cards_update" ON public.cards FOR UPDATE
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

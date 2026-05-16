-- Accept trades atomically on the server so both sides exchange cards together.
-- Client-side transfers cannot safely update both users because user_cards RLS
-- only allows users to modify their own collection rows.

CREATE OR REPLACE FUNCTION public.accept_trade(target_trade_id UUID)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  trade_row public.trades;
  offered_row public.user_cards;
  requested_row public.user_cards;
BEGIN
  SELECT *
  INTO trade_row
  FROM public.trades
  WHERE id = target_trade_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF trade_row.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade'
      USING ERRCODE = '42501';
  END IF;

  IF trade_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending trades can be accepted'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO offered_row
  FROM public.user_cards
  WHERE user_id = trade_row.from_user_id
    AND card_id = trade_row.offered_card_id
  FOR UPDATE;

  IF NOT FOUND OR offered_row.quantity < 1 THEN
    RAISE EXCEPTION 'The offered card is no longer available'
      USING ERRCODE = '22023';
  END IF;

  IF trade_row.requested_card_id IS NOT NULL THEN
    SELECT *
    INTO requested_row
    FROM public.user_cards
    WHERE user_id = trade_row.to_user_id
      AND card_id = trade_row.requested_card_id
    FOR UPDATE;

    IF NOT FOUND OR requested_row.quantity < 1 THEN
      RAISE EXCEPTION 'The requested card is no longer available'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF offered_row.quantity > 1 THEN
    UPDATE public.user_cards
    SET quantity = quantity - 1
    WHERE id = offered_row.id;
  ELSE
    DELETE FROM public.user_cards
    WHERE id = offered_row.id;
  END IF;

  INSERT INTO public.user_cards (user_id, card_id, quantity)
  VALUES (trade_row.to_user_id, trade_row.offered_card_id, 1)
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET quantity = public.user_cards.quantity + 1;

  IF trade_row.requested_card_id IS NOT NULL THEN
    IF requested_row.quantity > 1 THEN
      UPDATE public.user_cards
      SET quantity = quantity - 1
      WHERE id = requested_row.id;
    ELSE
      DELETE FROM public.user_cards
      WHERE id = requested_row.id;
    END IF;

    INSERT INTO public.user_cards (user_id, card_id, quantity)
    VALUES (trade_row.from_user_id, trade_row.requested_card_id, 1)
    ON CONFLICT (user_id, card_id)
    DO UPDATE SET quantity = public.user_cards.quantity + 1;
  END IF;

  UPDATE public.trades
  SET status = 'accepted'
  WHERE id = target_trade_id
  RETURNING * INTO trade_row;

  RETURN trade_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_trade(UUID) TO authenticated;

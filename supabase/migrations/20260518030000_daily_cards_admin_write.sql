-- Allow authenticated users to update and delete daily_cards (admin panel operations)
CREATE POLICY "daily_cards_admin_update"
  ON daily_cards FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "daily_cards_admin_delete"
  ON daily_cards FOR DELETE USING (auth.role() = 'authenticated');

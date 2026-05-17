-- Track attempts per card (not just per date) to support multiple daily cards
ALTER TABLE daily_attempts ADD COLUMN daily_card_id UUID;

-- Drop old unique constraint (one attempt per user per day)
ALTER TABLE daily_attempts DROP CONSTRAINT IF EXISTS daily_attempts_user_id_date_key;

-- New unique constraint: one attempt per user per card
ALTER TABLE daily_attempts ADD CONSTRAINT daily_attempts_user_card_unique UNIQUE(user_id, daily_card_id);

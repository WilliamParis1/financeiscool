-- Allow multiple daily cards per date (for manual force testing)
-- Drop FK from daily_attempts that references daily_cards(date) as PK
ALTER TABLE daily_attempts DROP CONSTRAINT IF EXISTS daily_attempts_date_fkey;

-- Drop the date primary key and replace with UUID
ALTER TABLE daily_cards DROP CONSTRAINT daily_cards_pkey;
ALTER TABLE daily_cards ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE daily_cards ADD PRIMARY KEY (id);

-- Keep date indexed for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_cards_date ON daily_cards(date);

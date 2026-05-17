-- Daily cards: one per day, auto-generated from news
CREATE TABLE daily_cards (
  date DATE PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  news_summary TEXT NOT NULL,
  mcq JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_cards_select"
  ON daily_cards FOR SELECT USING (true);

-- Daily attempts: one per user per day
CREATE TABLE daily_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL REFERENCES daily_cards(date) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 3),
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_attempts_select_own"
  ON daily_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_attempts_insert_own"
  ON daily_attempts FOR INSERT WITH CHECK (auth.uid() = user_id AND user_id = auth.uid());

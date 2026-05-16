# CardQuest — Setup Guide

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free project
2. Copy your **Project URL** and **anon public** key from Settings → API

## 2. Create .env file

Create a file called `.env` in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run the SQL schema

Go to your Supabase project → **SQL Editor** → paste and run this:

```sql
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table (templates)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'legendary')) NOT NULL,
  rarity_weight INTEGER NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User card collection
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Daily claims (cooldown enforced in the app; see CLAIM_COOLDOWN_MS)
CREATE TABLE daily_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homepage posts that explain a card through a finance/news story
CREATE TABLE card_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  news_source TEXT,
  market_summary TEXT,
  explanation TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trades
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  offered_card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  requested_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. Set up Row Level Security (RLS)

In SQL Editor, run:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades      ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users can insert/update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cards: anyone can read
CREATE POLICY "cards_select" ON cards FOR SELECT USING (true);
CREATE POLICY "cards_insert" ON cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "cards_update" ON cards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "cards_delete" ON cards FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- User cards: users can read all (for profiles/leaderboard), modify their own
CREATE POLICY "user_cards_select" ON user_cards FOR SELECT USING (true);
CREATE POLICY "user_cards_insert" ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_cards_update" ON user_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_cards_delete" ON user_cards FOR DELETE USING (auth.uid() = user_id);

-- Daily claims
CREATE POLICY "daily_claims_select" ON daily_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_claims_insert" ON daily_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Homepage card posts: everyone can read published posts; admins can manage all
CREATE POLICY "card_posts_select" ON card_posts FOR SELECT USING (
  is_published = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "card_posts_insert" ON card_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "card_posts_update" ON card_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "card_posts_delete" ON card_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Trades
CREATE POLICY "trades_select" ON trades FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "trades_insert" ON trades FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "trades_update" ON trades FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
```

## 5. Create the Storage bucket for card images

In Supabase → **Storage** → New bucket:
- Name: `card-images`
- Public: **YES** (check the toggle)

Then add a storage policy — in SQL Editor:

```sql
-- Allow admins to upload
CREATE POLICY "admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'card-images' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow anyone to read
CREATE POLICY "public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images');
```

## 6. Auto-create profiles + make yourself admin

This trigger makes the database automatically create a `profiles` row whenever
someone signs up (reading their chosen username), and auto-grants admin to
william.longin@gmail.com. This avoids the row-level-security error that occurs
when the app tries to insert the profile itself.

Run this in SQL Editor:

```sql
-- Remove the old approach if it was created earlier
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP FUNCTION IF EXISTS grant_admin_to_owner();

-- Create the profile automatically when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email = 'william.longin@gmail.com'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

> To make someone else an admin later, run:
> `UPDATE profiles SET is_admin = true WHERE username = 'their_username';`

## 6b. Turn off email confirmation (so signup logs you straight in)

In Supabase → **Authentication → Sign In / Providers → Email** →
turn **OFF** "Confirm email" → Save.

(Without this, new users must click an email link before they can log in.)

## 7. Run the app locally

```bash
npm install
npm run dev
```

## 8. Deploy to Netlify

1. Push this folder to a GitHub repo
2. In Netlify → **Add new site** → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify → Site settings → Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

## Changing the draw cooldown

The time between draws is controlled by one constant in
`src/pages/DailyDraw.jsx`:

```js
const CLAIM_COOLDOWN_MS = 60 * 1000          // 1 minute (testing)
// For a real once-per-day draw use:
// const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000
```

**One-time database migration** (run once in Supabase SQL Editor — needed
because the original schema only allowed one claim per calendar day):

```sql
ALTER TABLE daily_claims DROP CONSTRAINT IF EXISTS daily_claims_user_id_claimed_at_key;
ALTER TABLE daily_claims ALTER COLUMN claimed_at DROP DEFAULT;
ALTER TABLE daily_claims ALTER COLUMN claimed_at TYPE timestamptz USING claimed_at::timestamptz;
ALTER TABLE daily_claims ALTER COLUMN claimed_at SET DEFAULT now();
```

## Add the homepage finance card journal

If your database was created before this feature existed, run this once in
Supabase SQL Editor. It creates the editable homepage post area where an admin
can connect a card to a finance/news explanation.

```sql
CREATE TABLE IF NOT EXISTS card_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  news_source TEXT,
  market_summary TEXT,
  explanation TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE card_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_posts_select" ON card_posts;
DROP POLICY IF EXISTS "card_posts_insert" ON card_posts;
DROP POLICY IF EXISTS "card_posts_update" ON card_posts;
DROP POLICY IF EXISTS "card_posts_delete" ON card_posts;

CREATE POLICY "card_posts_select" ON card_posts FOR SELECT USING (
  is_published = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "card_posts_insert" ON card_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "card_posts_update" ON card_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "card_posts_delete" ON card_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
```

## How drop probability works

Every card has its own **drop weight** (a number you set in the Admin panel).
The daily draw picks a card at random, weighted by these numbers.

A card's real chance = `its weight ÷ total weight of all cards`.

Example with 3 cards:

| Card        | Weight | Drop chance       |
|-------------|--------|-------------------|
| Goblin      | 70     | 70 / 80 = 87.5%   |
| Knight      | 9      | 9 / 80 = 11.25%   |
| Dragon      | 1      | 1 / 80 = 1.25%    |

The Admin panel shows the live % next to each card, so you can tune drop
rates precisely. **Rarity** (common/rare/legendary) now only controls the
card's visual style (border colour and glow) — the weight controls how often
it actually drops.

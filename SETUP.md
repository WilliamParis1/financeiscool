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

-- Daily claims (one per user per day)
CREATE TABLE daily_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  claimed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, claimed_at)
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

## 6. Make yourself an admin (automatic)

Run this in SQL Editor. It creates a rule that **automatically** grants admin
to your account (william.longin@gmail.com) the moment you sign up — no manual
step needed:

```sql
CREATE OR REPLACE FUNCTION grant_admin_to_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = NEW.id) = 'william.longin@gmail.com' THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION grant_admin_to_owner();
```

> To make someone else an admin later, run:
> `UPDATE profiles SET is_admin = true WHERE username = 'their_username';`

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

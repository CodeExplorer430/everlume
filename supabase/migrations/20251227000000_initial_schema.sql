-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  full_name text,
  dob date,
  dod date,
  hero_image_url text,
  privacy text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on pages
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Pages policies
CREATE POLICY "Pages are viewable by everyone if public." ON pages
  FOR SELECT USING (privacy = 'public' OR auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create pages." ON pages
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their pages." ON pages
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their pages." ON pages
  FOR DELETE USING (auth.uid() = owner_id);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  thumb_path text,
  caption text,
  taken_at date,
  sort_index int DEFAULT 0,
  metadata jsonb,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Photos policies
CREATE POLICY "Photos are viewable by everyone if page is public." ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = photos.page_id
      AND (pages.privacy = 'public' OR pages.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage photos." ON photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = photos.page_id
      AND pages.owner_id = auth.uid()
    )
  );

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  provider text,
  provider_id text,
  poster_path text,
  title text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on videos
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Videos policies
CREATE POLICY "Videos are viewable by everyone if page is public." ON videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = videos.page_id
      AND (pages.privacy = 'public' OR pages.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage videos." ON videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = videos.page_id
      AND pages.owner_id = auth.uid()
    )
  );

-- Create timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  year int,
  text text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on timeline_events
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Timeline policies
CREATE POLICY "Timeline events are viewable by everyone if page is public." ON timeline_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = timeline_events.page_id
      AND (pages.privacy = 'public' OR pages.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage timeline events." ON timeline_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = timeline_events.page_id
      AND pages.owner_id = auth.uid()
    )
  );

-- Create guestbook table
CREATE TABLE IF NOT EXISTS guestbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  name text,
  email text,
  message text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on guestbook
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

-- Guestbook policies
CREATE POLICY "Approved guestbook entries are viewable by everyone." ON guestbook
  FOR SELECT USING (is_approved = true OR EXISTS (
    SELECT 1 FROM pages
    WHERE pages.id = guestbook.page_id
    AND pages.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can post to guestbook." ON guestbook
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can manage guestbook entries." ON guestbook
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = guestbook.page_id
      AND pages.owner_id = auth.uid()
    )
  );

-- Create redirects table
CREATE TABLE IF NOT EXISTS redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode text UNIQUE,
  target_url text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on redirects
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

-- Redirects policies
CREATE POLICY "Redirects are viewable by everyone." ON redirects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create redirects." ON redirects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update redirects." ON redirects
  FOR UPDATE USING (auth.uid() = created_by);

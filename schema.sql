-- SocialSync Expansion Pack 1: Schema Update

-- 0. Update Meetings Table to include created_by
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 1. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Reactions Table (Simplified)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    UNIQUE(meeting_id, user_id, emoji)
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'comment', 'reaction', 'badge', 'meeting'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Badges Table
CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL, -- Lucide icon name
    criteria_type TEXT NOT NULL, -- 'meeting_count', 'streak', 'participant_count'
    criteria_value INTEGER NOT NULL
);

-- 5. User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- RLS POLICIES (Enable RLS first)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Public read for group context - simplified for MVP)
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Users can react" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reaction" ON reactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public read badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Public read user_badges" ON user_badges FOR SELECT USING (true);

-- SEED BADGES
INSERT INTO badges (name, description, icon_name, criteria_type, criteria_value) VALUES
('Icebreaker', 'Logged your first reunion!', 'Zap', 'meeting_count', 1),
('Socialite', 'Participated in 5 reunions', 'Users', 'meeting_count', 5),
('Party Animal', 'Reunion with 5 or more people', 'PartyPopper', 'participant_count', 5),
('Loyal Sync', 'Seen the same person 3 times', 'Heart', 'streak', 3)
ON CONFLICT DO NOTHING;

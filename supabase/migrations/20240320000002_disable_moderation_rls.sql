-- Disable RLS on moderation table since we're using password-based admin authentication
-- This allows the admin panel to work without requiring Supabase Auth sessions

-- Drop existing policies
DROP POLICY IF EXISTS "Allow moderators to manage moderation" ON moderation;
DROP POLICY IF EXISTS "Allow moderators to read moderation" ON moderation;

-- Disable RLS on moderation table
ALTER TABLE moderation DISABLE ROW LEVEL SECURITY; 
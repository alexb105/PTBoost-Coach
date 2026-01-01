-- Add message likes and replies functionality
-- This migration adds support for liking messages and replying to messages

-- Create message_likes table
CREATE TABLE IF NOT EXISTS message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  liked_by TEXT NOT NULL CHECK (liked_by IN ('admin', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, customer_id, liked_by)
);

-- Create index on message_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_customer ON message_likes(customer_id);

-- Enable RLS for message_likes
ALTER TABLE message_likes ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage message likes"
ON message_likes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read message likes
CREATE POLICY "Users can read message likes"
ON message_likes
FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated users to like messages
CREATE POLICY "Users can like messages"
ON message_likes
FOR INSERT
TO authenticated
WITH CHECK (
  (liked_by = 'customer' AND auth.uid() = customer_id) OR
  (liked_by = 'admin')
);

-- Create policy for authenticated users to unlike messages
CREATE POLICY "Users can unlike messages"
ON message_likes
FOR DELETE
TO authenticated
USING (
  (liked_by = 'customer' AND auth.uid() = customer_id) OR
  (liked_by = 'admin')
);

-- Create message_replies table
CREATE TABLE IF NOT EXISTS message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('admin', 'customer')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on message_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_replies_message_id ON message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_message_replies_customer ON message_replies(customer_id);

-- Enable RLS for message_replies
ALTER TABLE message_replies ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage message replies"
ON message_replies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read message replies
CREATE POLICY "Users can read message replies"
ON message_replies
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Create policy for authenticated users to send replies
CREATE POLICY "Users can send replies"
ON message_replies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id AND sender = 'customer');


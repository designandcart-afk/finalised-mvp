-- Add RLS policies for project_chat_messages

-- Enable RLS
ALTER TABLE project_chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: Any authenticated user can view messages (adjust if needed)
CREATE POLICY "Chat messages viewable by authenticated users"
  ON project_chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Any authenticated user can send messages (adjust if needed)
CREATE POLICY "Chat messages insertable by authenticated users"
  ON project_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Users can update their own messages
CREATE POLICY "Chat messages updatable by sender"
  ON project_chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- DELETE: Users can delete their own messages
CREATE POLICY "Chat messages deletable by sender"
  ON project_chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

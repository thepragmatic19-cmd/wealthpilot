-- Migration 010: Education reads table for cross-device read tracking
CREATE TABLE IF NOT EXISTS education_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE education_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own education reads"
  ON education_reads
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_education_reads_user_id ON education_reads(user_id);

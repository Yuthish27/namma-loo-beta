/*
  # Create reports table

  1. New Tables
    - `reports`
      - `id` (bigint, primary key, auto-increment)
      - `toilet_id` (text, foreign key to kakoos.uuid)
      - `user_id` (uuid, optional for demo)
      - `issue_text` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `reports` table
    - Add policies for public access (demo purposes)
*/

-- Drop existing reports table if it exists to avoid conflicts
DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  toilet_id text NOT NULL,
  user_id uuid DEFAULT gen_random_uuid(),
  issue_text text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to kakoos table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kakoos') THEN
    ALTER TABLE reports ADD CONSTRAINT fk_reports_toilet_id 
    FOREIGN KEY (toilet_id) REFERENCES kakoos(uuid) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
  ON reports
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create reports"
  ON reports
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update reports"
  ON reports
  FOR UPDATE
  TO public
  USING (true);
/*
  # Create saved toilets table

  1. New Tables
    - `saved_toilets`
      - `id` (bigint, primary key, auto-increment)
      - `user_id` (bigint, foreign key to users.id)
      - `toilet_id` (text, foreign key to kakoos.uuid)
      - `notes` (text, optional user notes)
      - `saved_at` (timestamp)

  2. Security
    - Enable RLS on `saved_toilets` table
    - Add policies for user access
*/

CREATE TABLE IF NOT EXISTS saved_toilets (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toilet_id text NOT NULL REFERENCES kakoos(uuid) ON DELETE CASCADE,
  notes text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, toilet_id)
);

ALTER TABLE saved_toilets ENABLE ROW LEVEL SECURITY;

-- Users can only access their own saved toilets
CREATE POLICY "Users can read own saved toilets"
  ON saved_toilets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create own saved toilets"
  ON saved_toilets
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own saved toilets"
  ON saved_toilets
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Users can delete own saved toilets"
  ON saved_toilets
  FOR DELETE
  TO public
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_saved_toilets_user_id ON saved_toilets(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_toilets_toilet_id ON saved_toilets(toilet_id);
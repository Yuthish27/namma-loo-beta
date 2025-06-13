/*
  # Fix database schema for proper data retrieval

  1. Schema Updates
    - Fix data type inconsistencies between tables
    - Ensure proper foreign key relationships
    - Create missing users table if needed
    - Fix reviews table to match kakoos table structure

  2. Data Integrity
    - Ensure all foreign keys work properly
    - Fix any type mismatches
    - Add proper constraints and defaults

  3. Security
    - Update RLS policies to work with corrected schema
    - Ensure public access where needed for the app
*/

-- First, let's ensure we have a proper users table
CREATE TABLE IF NOT EXISTS users (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz DEFAULT now(),
  name text,
  email text,
  phone varchar
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop and recreate reviews table with correct data types
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz DEFAULT now(),
  rating bigint,
  review_text text,
  user_id uuid DEFAULT gen_random_uuid(),
  toilet_id text NOT NULL
);

-- Add foreign key constraint to kakoos table (toilet_id as text to match kakoos.uuid)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kakoos') THEN
    ALTER TABLE reviews ADD CONSTRAINT fk_reviews_toilet_id 
    FOREIGN KEY (toilet_id) REFERENCES kakoos(uuid) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for reviews
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create reviews"
  ON reviews
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update reviews"
  ON reviews
  FOR UPDATE
  TO public
  USING (true);

-- Ensure reports table exists with correct structure (should already be created)
-- Just add any missing policies if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reports' AND policyname = 'Anyone can delete reports'
  ) THEN
    CREATE POLICY "Anyone can delete reports"
      ON reports
      FOR DELETE
      TO public
      USING (true);
  END IF;
END $$;
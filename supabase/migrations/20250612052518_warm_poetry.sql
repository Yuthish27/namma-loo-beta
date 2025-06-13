/*
  # Fix all database tables and relationships

  1. Tables to fix:
    - Ensure users table exists with correct structure
    - Fix reviews table with proper foreign keys
    - Fix reports table with proper foreign keys
    - Ensure all RLS policies work correctly

  2. Data Types:
    - Match kakoos.uuid (text) with foreign key references
    - Use consistent ID types across tables

  3. Security:
    - Enable RLS on all tables
    - Add public access policies for demo purposes
*/

-- Drop existing tables to recreate with correct structure
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz DEFAULT now(),
  name text,
  email text,
  phone varchar
);

-- Create reviews table with correct foreign key types
CREATE TABLE reviews (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  toilet_id text NOT NULL REFERENCES kakoos(uuid) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  review_text text,
  rating bigint CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Create reports table with correct foreign key types
CREATE TABLE reports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  toilet_id text NOT NULL REFERENCES kakoos(uuid) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  issue_text text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Add policies for users table
CREATE POLICY "Anyone can read users"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create users"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update users"
  ON users
  FOR UPDATE
  TO public
  USING (true);

-- Add policies for reviews table
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

-- Add policies for reports table
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

CREATE POLICY "Anyone can delete reports"
  ON reports
  FOR DELETE
  TO public
  USING (true);
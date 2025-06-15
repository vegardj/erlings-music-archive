
-- Create a separate publishers table
CREATE TABLE publisher (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert unique publishers from existing publication data
INSERT INTO publisher (name)
SELECT DISTINCT publisher_name 
FROM publication 
WHERE publisher_name IS NOT NULL AND publisher_name != '';

-- Add publisher_id column to publication table
ALTER TABLE publication ADD COLUMN publisher_id INTEGER REFERENCES publisher(id);

-- Update publication records to reference the publisher table
UPDATE publication 
SET publisher_id = publisher.id
FROM publisher 
WHERE publication.publisher_name = publisher.name;

-- Create index for better performance
CREATE INDEX idx_publication_publisher_id ON publication(publisher_id);
CREATE INDEX idx_publisher_name ON publisher(name);

-- We'll keep publisher_name for now during transition, but it will be deprecated

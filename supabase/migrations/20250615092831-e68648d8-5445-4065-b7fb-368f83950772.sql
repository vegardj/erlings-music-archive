
-- Create enums first
CREATE TYPE gender_enum AS ENUM ('female', 'male', 'unknown');
CREATE TYPE contributor_role AS ENUM ('composer', 'lyricist', 'arranger', 'text_author', 'unknown');
CREATE TYPE file_kind AS ENUM ('pdf', 'musescore', 'image', 'audio', 'other');

-- Create category table
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Create person table
CREATE TABLE person (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    birth_year SMALLINT,
    death_year SMALLINT,
    gender gender_enum DEFAULT 'unknown',
    notes TEXT
);

-- Create work table
CREATE TABLE work (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES category(id),
    title TEXT NOT NULL,
    form_or_genre TEXT,
    key_signature TEXT,
    composition_year SMALLINT,
    composition_year_to SMALLINT,
    rating INT CHECK (rating BETWEEN 0 AND 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create work_contributor bridge table
CREATE TABLE work_contributor (
    work_id INT REFERENCES work(id) ON DELETE CASCADE,
    person_id INT REFERENCES person(id) ON DELETE CASCADE,
    role contributor_role DEFAULT 'unknown',
    sequence_no SMALLINT DEFAULT 1,
    notes TEXT,
    PRIMARY KEY (work_id, person_id, role)
);

-- Create publication table
CREATE TABLE publication (
    id SERIAL PRIMARY KEY,
    work_id INT REFERENCES work(id) ON DELETE CASCADE,
    publisher_name TEXT,
    plate_number TEXT,
    publication_year SMALLINT,
    edition_note TEXT
);

-- Create archive_copy table
CREATE TABLE archive_copy (
    id SERIAL PRIMARY KEY,
    work_id INT REFERENCES work(id) ON DELETE CASCADE,
    location TEXT,
    is_duplicate BOOLEAN DEFAULT FALSE,
    has_musescore BOOLEAN DEFAULT FALSE,
    private_copy BOOLEAN DEFAULT FALSE,
    condition_note TEXT
);

-- Create file_asset table
CREATE TABLE file_asset (
    id SERIAL PRIMARY KEY,
    work_id INT REFERENCES work(id) ON DELETE CASCADE,
    kind file_kind,
    uri TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Insert some sample categories based on your Excel worksheets
INSERT INTO category (name, description) VALUES 
('Eldre populærmusikk', 'Historical popular music collection'),
('1905-noter', 'Musical scores from 1905'),
('Folkemusikk', 'Traditional folk music'),
('Klassisk', 'Classical music compositions');

-- Enable Row Level Security (we'll keep it simple for now since no authentication yet)
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
ALTER TABLE work ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_contributor ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_copy ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_asset ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now (since no authentication yet)
CREATE POLICY "Allow all operations on category" ON category FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on person" ON person FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on work" ON work FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on work_contributor" ON work_contributor FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on publication" ON publication FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on archive_copy" ON archive_copy FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on file_asset" ON file_asset FOR ALL USING (true) WITH CHECK (true);


-- Drop all existing tables (in correct order to handle foreign key constraints)
DROP TABLE IF EXISTS work_contributor CASCADE;
DROP TABLE IF EXISTS publication CASCADE;
DROP TABLE IF EXISTS file_asset CASCADE;
DROP TABLE IF EXISTS archive_copy CASCADE;
DROP TABLE IF EXISTS work CASCADE;
DROP TABLE IF EXISTS person CASCADE;
DROP TABLE IF EXISTS category CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS contributor_role CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP TYPE IF EXISTS file_asset_kind CASCADE;

-- Create enums
CREATE TYPE contributor_role AS ENUM ('composer', 'lyricist', 'arranger', 'translator', 'performer', 'unknown');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'unknown');

-- Create category table
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Create person table with profile_link
CREATE TABLE person (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    birth_year SMALLINT,
    death_year SMALLINT,
    gender gender_enum DEFAULT 'unknown',
    profile_link TEXT,
    notes TEXT
);

-- Create work table with title_link
CREATE TABLE work (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    title_link TEXT,
    composition_year SMALLINT,
    composition_year_to SMALLINT,
    key_signature TEXT,
    form_or_genre TEXT,
    comments TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category_id INTEGER REFERENCES category(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create work_contributor table with link column
CREATE TABLE work_contributor (
    work_id INTEGER REFERENCES work(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES person(id) ON DELETE CASCADE,
    role contributor_role NOT NULL DEFAULT 'unknown',
    link TEXT,
    sequence_no SMALLINT DEFAULT 1,
    notes TEXT,
    PRIMARY KEY (work_id, person_id, role)
);

-- Create publication table
CREATE TABLE publication (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES work(id) ON DELETE CASCADE,
    publisher_name TEXT,
    publication_year SMALLINT,
    plate_number TEXT,
    edition_note TEXT
);

-- Add comments to explain the link columns
COMMENT ON COLUMN work.title_link IS 'URL link associated with the work title (e.g., MuseScore link)';
COMMENT ON COLUMN person.profile_link IS 'URL link to person''s profile or biography';
COMMENT ON COLUMN work_contributor.link IS 'URL link specific to this contributor relationship';

-- Create indexes for better performance
CREATE INDEX idx_work_category ON work(category_id);
CREATE INDEX idx_work_contributor_work ON work_contributor(work_id);
CREATE INDEX idx_work_contributor_person ON work_contributor(person_id);
CREATE INDEX idx_publication_work ON publication(work_id);
CREATE INDEX idx_person_name ON person(full_name);
CREATE INDEX idx_work_title ON work(title);

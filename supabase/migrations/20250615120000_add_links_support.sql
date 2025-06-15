
-- Add link columns to support URLs for works and people
ALTER TABLE work ADD COLUMN title_link text;
ALTER TABLE person ADD COLUMN profile_link text;
ALTER TABLE work_contributor ADD COLUMN link text;

-- Add comments to explain the new columns
COMMENT ON COLUMN work.title_link IS 'URL link associated with the work title (e.g., MuseScore link)';
COMMENT ON COLUMN person.profile_link IS 'URL link to person''s profile or biography';
COMMENT ON COLUMN work_contributor.link IS 'URL link specific to this contributor relationship';

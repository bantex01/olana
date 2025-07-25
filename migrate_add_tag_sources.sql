-- Migration: Add tag_sources column to services table
-- This tracks the source of each tag for priority resolution and UI display

-- Add the new tag_sources column
ALTER TABLE services 
ADD COLUMN tag_sources JSONB DEFAULT '{}';

-- Add index for efficient querying of tag sources
CREATE INDEX idx_services_tag_sources ON services USING gin (tag_sources);

-- Add comment explaining the column structure
COMMENT ON COLUMN services.tag_sources IS 'JSONB object tracking source of each tag. Format: {"tag_name": "source_type"}. Sources: "otel", "alertmanager", "user"';

-- Update existing services to have empty tag_sources object (they already default to '{}')
-- This is mainly for clarity and to ensure no NULL values
UPDATE services SET tag_sources = '{}' WHERE tag_sources IS NULL;

-- Add NOT NULL constraint now that all existing rows have a value
ALTER TABLE services ALTER COLUMN tag_sources SET NOT NULL;

-- Verify the migration
SELECT 
    'Migration completed successfully. Services table now has tag_sources column.' as status,
    COUNT(*) as total_services,
    COUNT(*) FILTER (WHERE tag_sources = '{}') as services_with_empty_sources
FROM services;
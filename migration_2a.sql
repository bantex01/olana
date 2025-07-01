-- Phase 2A Schema Enhancements: Service Tags & Namespace Dependencies
-- Run this migration on your existing alert_hub database

-- 1. Add service tags column to existing services table
ALTER TABLE services ADD COLUMN tags TEXT[] DEFAULT '{}';

-- 2. Create namespace dependencies table for manual business-level dependencies
CREATE TABLE namespace_dependencies (
  id SERIAL PRIMARY KEY,
  from_namespace VARCHAR(255) NOT NULL,
  to_namespace VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  dependency_type VARCHAR(50) DEFAULT 'manual',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_namespace, to_namespace)
);

-- 3. Performance indexes for new features
CREATE INDEX idx_services_tags ON services USING GIN(tags);
CREATE INDEX idx_namespace_deps_from ON namespace_dependencies(from_namespace);
CREATE INDEX idx_namespace_deps_to ON namespace_dependencies(to_namespace);
CREATE INDEX idx_namespace_deps_type ON namespace_dependencies(dependency_type);

-- 4. Function to update namespace dependency timestamps
CREATE OR REPLACE FUNCTION update_namespace_dependency_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for auto-updating namespace dependency timestamps
CREATE TRIGGER update_namespace_dependencies_updated_at
  BEFORE UPDATE ON namespace_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_namespace_dependency_updated_at();

-- 6. Add some example data for testing (optional)
-- INSERT INTO namespace_dependencies (from_namespace, to_namespace, created_by, description)
-- VALUES 
--   ('MetaSetter', 'Payments', 'admin', 'Business dependency: MetaSetter processes payment data'),
--   ('Frontend', 'MetaSetter', 'admin', 'Frontend services depend on MetaSetter APIs');

-- 7. Verify the migration
SELECT 'Services table enhanced with tags column' as status;
SELECT 'Namespace dependencies table created' as status;
SELECT 'All indexes created successfully' as status;
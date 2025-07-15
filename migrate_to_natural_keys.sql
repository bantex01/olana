-- Migration to Natural Key Linking Schema
-- This script drops existing tables and recreates them with natural key relationships

-- Drop existing tables in correct order (dependencies first)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS service_dependencies CASCADE;
DROP TABLE IF EXISTS namespace_dependencies CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS alerts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS service_dependencies_id_seq CASCADE;
DROP SEQUENCE IF EXISTS namespace_dependencies_id_seq CASCADE;
DROP SEQUENCE IF EXISTS services_id_seq CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_alert_last_seen() CASCADE;
DROP FUNCTION IF EXISTS update_last_seen() CASCADE;
DROP FUNCTION IF EXISTS update_namespace_dependency_updated_at() CASCADE;

-- Recreate helper functions
CREATE FUNCTION public.update_alert_last_seen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_last_seen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_namespace_dependency_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate SERVICES table (minimal changes, remove id as we'll use natural key)
CREATE TABLE public.services (
    service_namespace character varying(255) NOT NULL,
    service_name character varying(255) NOT NULL,
    environment character varying(100),
    team character varying(100),
    component_type character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now(),
    tags text[] DEFAULT '{}'::text[],
    external_calls jsonb DEFAULT '[]'::jsonb,
    database_calls jsonb DEFAULT '[]'::jsonb,
    rpc_calls jsonb DEFAULT '[]'::jsonb,
    
    -- Natural key as primary key
    PRIMARY KEY (service_namespace, service_name)
);

-- Recreate SERVICE_DEPENDENCIES table (using natural keys instead of IDs)
CREATE TABLE public.service_dependencies (
    from_service_namespace character varying(255) NOT NULL,
    from_service_name character varying(255) NOT NULL,
    to_service_namespace character varying(255) NOT NULL,
    to_service_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now(),
    
    -- Composite primary key
    PRIMARY KEY (from_service_namespace, from_service_name, to_service_namespace, to_service_name),
    
    -- Foreign key references to services
    FOREIGN KEY (from_service_namespace, from_service_name) 
        REFERENCES public.services(service_namespace, service_name) ON DELETE CASCADE,
    FOREIGN KEY (to_service_namespace, to_service_name) 
        REFERENCES public.services(service_namespace, service_name) ON DELETE CASCADE
);

-- Recreate ALERTS table (using natural keys instead of service_id)
CREATE TABLE public.alerts (
    id serial PRIMARY KEY,
    service_namespace character varying(255) NOT NULL,
    service_name character varying(255) NOT NULL,
    instance_id character varying(255) DEFAULT ''::character varying,
    severity character varying(20) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'firing'::character varying,
    count integer DEFAULT 1,
    first_seen timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone,
    alert_source character varying(100) DEFAULT 'manual'::character varying,
    external_alert_id character varying(255),
    
    -- Constraints
    CONSTRAINT alerts_severity_check CHECK (((severity)::text = ANY ((ARRAY['fatal'::character varying, 'critical'::character varying, 'warning'::character varying, 'none'::character varying])::text[]))),
    CONSTRAINT alerts_status_check CHECK (((status)::text = ANY ((ARRAY['firing'::character varying, 'resolved'::character varying])::text[]))),
    
    -- Unique constraint on natural key + alert details
    CONSTRAINT alerts_service_instance_severity_message_unique 
        UNIQUE (service_namespace, service_name, instance_id, severity, message),
    
    -- Foreign key reference to services
    FOREIGN KEY (service_namespace, service_name) 
        REFERENCES public.services(service_namespace, service_name) ON DELETE CASCADE
);

-- Recreate NAMESPACE_DEPENDENCIES table (unchanged)
CREATE TABLE public.namespace_dependencies (
    id serial PRIMARY KEY,
    from_namespace character varying(255) NOT NULL,
    to_namespace character varying(255) NOT NULL,
    created_by character varying(255),
    dependency_type character varying(50) DEFAULT 'manual'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    
    CONSTRAINT namespace_dependencies_from_namespace_to_namespace_key 
        UNIQUE (from_namespace, to_namespace)
);

-- Create optimized indexes
CREATE INDEX idx_services_last_seen ON public.services USING btree (last_seen);
CREATE INDEX idx_services_environment ON public.services USING btree (environment);
CREATE INDEX idx_services_team ON public.services USING btree (team);
CREATE INDEX idx_services_component_type ON public.services USING btree (component_type);
CREATE INDEX idx_services_tags ON public.services USING gin (tags);

CREATE INDEX idx_service_dependencies_from ON public.service_dependencies USING btree (from_service_namespace, from_service_name);
CREATE INDEX idx_service_dependencies_to ON public.service_dependencies USING btree (to_service_namespace, to_service_name);
CREATE INDEX idx_service_dependencies_last_seen ON public.service_dependencies USING btree (last_seen);

CREATE INDEX idx_alerts_service ON public.alerts USING btree (service_namespace, service_name, status);
CREATE INDEX idx_alerts_severity ON public.alerts USING btree (severity, status);
CREATE INDEX idx_alerts_active ON public.alerts USING btree (status, created_at) WHERE ((status)::text = 'firing'::text);
CREATE INDEX idx_alerts_last_seen ON public.alerts USING btree (last_seen);

CREATE INDEX idx_namespace_deps_from ON public.namespace_dependencies USING btree (from_namespace);
CREATE INDEX idx_namespace_deps_to ON public.namespace_dependencies USING btree (to_namespace);
CREATE INDEX idx_namespace_deps_type ON public.namespace_dependencies USING btree (dependency_type);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_services_last_seen 
    BEFORE UPDATE ON public.services 
    FOR EACH ROW EXECUTE FUNCTION public.update_last_seen();

CREATE TRIGGER update_dependencies_last_seen 
    BEFORE UPDATE ON public.service_dependencies 
    FOR EACH ROW EXECUTE FUNCTION public.update_last_seen();

CREATE TRIGGER update_alerts_last_seen 
    BEFORE UPDATE ON public.alerts 
    FOR EACH ROW EXECUTE FUNCTION public.update_alert_last_seen();

CREATE TRIGGER update_namespace_dependencies_updated_at 
    BEFORE UPDATE ON public.namespace_dependencies 
    FOR EACH ROW EXECUTE FUNCTION public.update_namespace_dependency_updated_at();

-- Insert some test namespace dependencies to verify the migration worked
INSERT INTO public.namespace_dependencies (from_namespace, to_namespace, created_by, dependency_type, description) VALUES
('Frontend', 'MetaSetter', 'migration-script', 'business', 'Frontend services depend on MetaSetter APIs for data processing'),
('Analytics', 'Payments', 'migration-script', 'data-flow', 'Analytics processes payment data for reporting'),
('Frontend', 'Payments', 'migration-script', 'business', 'Frontend needs payment services for transactions');

-- Migration complete
SELECT 'Migration to natural key linking completed successfully!' as status;
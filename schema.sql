--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Postgres.app)
-- Dumped by pg_dump version 16.9 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_old_alert_events(integer); Type: FUNCTION; Schema: public; Owner: adalton
--

CREATE FUNCTION public.cleanup_old_alert_events(days_old integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete events older than specified days for resolved incidents
  DELETE FROM alert_events 
  WHERE event_time < NOW() - (days_old || ' days')::INTERVAL
    AND incident_id IN (
      SELECT id FROM alert_incidents 
      WHERE status = 'resolved' 
        AND incident_end < NOW() - (days_old || ' days')::INTERVAL
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_alert_events(days_old integer) OWNER TO adalton;

--
-- Name: refresh_services_overview_cache(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_services_overview_cache() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY services_overview_cache;
END;
$$;


ALTER FUNCTION public.refresh_services_overview_cache() OWNER TO postgres;

--
-- Name: update_alert_incidents_updated_at(); Type: FUNCTION; Schema: public; Owner: adalton
--

CREATE FUNCTION public.update_alert_incidents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_alert_incidents_updated_at() OWNER TO adalton;

--
-- Name: update_alert_last_seen(); Type: FUNCTION; Schema: public; Owner: adalton
--

CREATE FUNCTION public.update_alert_last_seen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_alert_last_seen() OWNER TO adalton;

--
-- Name: update_last_seen(); Type: FUNCTION; Schema: public; Owner: adalton
--

CREATE FUNCTION public.update_last_seen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_seen() OWNER TO adalton;

--
-- Name: update_namespace_dependency_updated_at(); Type: FUNCTION; Schema: public; Owner: adalton
--

CREATE FUNCTION public.update_namespace_dependency_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_namespace_dependency_updated_at() OWNER TO adalton;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: active_count; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.active_count (
    count bigint
);


ALTER TABLE public.active_count OWNER TO adalton;

--
-- Name: alert_events; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.alert_events (
    id integer NOT NULL,
    incident_id integer NOT NULL,
    event_type character varying(20) NOT NULL,
    event_time timestamp without time zone NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT alert_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['fired'::character varying, 'resolved'::character varying, 'updated'::character varying, 'acknowledged'::character varying])::text[])))
);


ALTER TABLE public.alert_events OWNER TO adalton;

--
-- Name: TABLE alert_events; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON TABLE public.alert_events IS 'Individual fire/resolve/update events for each incident - enables timeline reconstruction';


--
-- Name: COLUMN alert_events.event_type; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_events.event_type IS 'Type of event: fired (alert started), resolved (alert ended), updated (alert modified)';


--
-- Name: COLUMN alert_events.event_time; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_events.event_time IS 'Exact timestamp when this event occurred';


--
-- Name: COLUMN alert_events.event_data; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_events.event_data IS 'Additional event context: webhook payload, counts, external IDs, etc.';


--
-- Name: alert_incidents; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.alert_incidents (
    id integer NOT NULL,
    service_namespace character varying(255) NOT NULL,
    service_name character varying(255) NOT NULL,
    instance_id character varying(255) DEFAULT ''::character varying,
    severity character varying(20) NOT NULL,
    message text NOT NULL,
    alert_fingerprint character varying(64) NOT NULL,
    incident_start timestamp without time zone NOT NULL,
    incident_end timestamp without time zone,
    status character varying(20) DEFAULT 'firing'::character varying,
    alert_source character varying(100) DEFAULT 'manual'::character varying,
    external_alert_id character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    acknowledged_at timestamp without time zone,
    acknowledged_by character varying(255),
    CONSTRAINT alert_incidents_severity_check CHECK (((severity)::text = ANY ((ARRAY['fatal'::character varying, 'critical'::character varying, 'warning'::character varying, 'none'::character varying])::text[]))),
    CONSTRAINT alert_incidents_status_check CHECK (((status)::text = ANY ((ARRAY['firing'::character varying, 'resolved'::character varying])::text[]))),
    CONSTRAINT check_incident_end_after_start CHECK (((incident_end IS NULL) OR (incident_end >= incident_start)))
);


ALTER TABLE public.alert_incidents OWNER TO adalton;

--
-- Name: TABLE alert_incidents; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON TABLE public.alert_incidents IS 'Logical grouping of related alert events with complete lifecycle tracking';


--
-- Name: COLUMN alert_incidents.alert_fingerprint; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_incidents.alert_fingerprint IS 'SHA256 hash of service+instance+severity+message for grouping identical alerts';


--
-- Name: COLUMN alert_incidents.incident_start; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_incidents.incident_start IS 'When this specific incident began (first fire event)';


--
-- Name: COLUMN alert_incidents.incident_end; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_incidents.incident_end IS 'When this specific incident was resolved (NULL if still firing)';


--
-- Name: COLUMN alert_incidents.status; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_incidents.status IS 'Current status: firing (active) or resolved (closed)';


--
-- Name: COLUMN alert_incidents.acknowledged_at; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_incidents.acknowledged_at IS 'Timestamp when the incident was acknowledged by a user';


--
-- Name: COLUMN alert_incidents.acknowledged_by; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.alert_incidents.acknowledged_by IS 'User who acknowledged the incident (default_user for now)';


--
-- Name: active_incidents; Type: VIEW; Schema: public; Owner: adalton
--

CREATE VIEW public.active_incidents AS
 SELECT id,
    service_namespace,
    service_name,
    instance_id,
    severity,
    message,
    incident_start,
    alert_source,
    (EXTRACT(epoch FROM (now() - (incident_start)::timestamp with time zone)) / (3600)::numeric) AS hours_active,
    ( SELECT count(*) AS count
           FROM public.alert_events e
          WHERE (e.incident_id = i.id)) AS event_count,
    ( SELECT max(e.event_time) AS max
           FROM public.alert_events e
          WHERE (e.incident_id = i.id)) AS last_event_time
   FROM public.alert_incidents i
  WHERE ((status)::text = 'firing'::text)
  ORDER BY incident_start DESC;


ALTER VIEW public.active_incidents OWNER TO adalton;


--
-- Name: alert_events_id_seq; Type: SEQUENCE; Schema: public; Owner: adalton
--

CREATE SEQUENCE public.alert_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_events_id_seq OWNER TO adalton;

--
-- Name: alert_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adalton
--

ALTER SEQUENCE public.alert_events_id_seq OWNED BY public.alert_events.id;


--
-- Name: alert_incidents_id_seq; Type: SEQUENCE; Schema: public; Owner: adalton
--

CREATE SEQUENCE public.alert_incidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_incidents_id_seq OWNER TO adalton;

--
-- Name: alert_incidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adalton
--

ALTER SEQUENCE public.alert_incidents_id_seq OWNED BY public.alert_incidents.id;


--
-- Name: alerts_legacy_view; Type: VIEW; Schema: public; Owner: adalton
--

CREATE VIEW public.alerts_legacy_view AS
 SELECT id,
    service_namespace,
    service_name,
    instance_id,
    severity,
    message,
    status,
    ( SELECT count(*) AS count
           FROM public.alert_events e
          WHERE ((e.incident_id = i.id) AND ((e.event_type)::text = 'fired'::text))) AS count,
    incident_start AS first_seen,
    COALESCE(incident_end, updated_at) AS last_seen,
    created_at,
    incident_end AS resolved_at,
    alert_source,
    external_alert_id
   FROM public.alert_incidents i
  ORDER BY incident_start DESC;


ALTER VIEW public.alerts_legacy_view OWNER TO adalton;

--
-- Name: VIEW alerts_legacy_view; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON VIEW public.alerts_legacy_view IS 'Backward compatibility view that presents incidents in old alerts table format';


--
-- Name: event_count; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.event_count (
    count bigint
);


ALTER TABLE public.event_count OWNER TO adalton;

--
-- Name: namespace_dependencies; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.namespace_dependencies (
    id integer NOT NULL,
    from_namespace character varying(255) NOT NULL,
    to_namespace character varying(255) NOT NULL,
    created_by character varying(255),
    dependency_type character varying(50) DEFAULT 'manual'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.namespace_dependencies OWNER TO adalton;

--
-- Name: namespace_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: adalton
--

CREATE SEQUENCE public.namespace_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.namespace_dependencies_id_seq OWNER TO adalton;

--
-- Name: namespace_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adalton
--

ALTER SEQUENCE public.namespace_dependencies_id_seq OWNED BY public.namespace_dependencies.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_number character varying(10) NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT now(),
    checksum character varying(64)
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schema_migrations_id_seq OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: service_dependencies; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.service_dependencies (
    from_service_namespace character varying(255) NOT NULL,
    from_service_name character varying(255) NOT NULL,
    to_service_namespace character varying(255) NOT NULL,
    to_service_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now()
);


ALTER TABLE public.service_dependencies OWNER TO adalton;

--
-- Name: services; Type: TABLE; Schema: public; Owner: adalton
--

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
    tag_sources jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.services OWNER TO adalton;

--
-- Name: COLUMN services.tag_sources; Type: COMMENT; Schema: public; Owner: adalton
--

COMMENT ON COLUMN public.services.tag_sources IS 'JSONB object tracking source of each tag. Format: {"tag_name": "source_type"}. Sources: "otel", "alertmanager", "user"';


--
-- Name: services_overview_cache; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.services_overview_cache AS
 WITH service_stats AS (
         SELECT count(*) AS total_services,
            count(*) FILTER (WHERE (services.last_seen > (now() - '24:00:00'::interval))) AS active_services,
            count(*) FILTER (WHERE (services.last_seen < (now() - '7 days'::interval))) AS stale_services,
            count(*) FILTER (WHERE (services.created_at > (now() - '24:00:00'::interval))) AS recently_discovered,
            count(*) FILTER (WHERE (((services.team)::text = 'unknown'::text) OR ((services.environment)::text = 'unknown'::text))) AS missing_metadata,
            count(DISTINCT services.service_namespace) AS total_namespaces,
            count(DISTINCT services.environment) AS total_environments
           FROM public.services
        ), dependency_stats AS (
         SELECT count(*) AS total_dependencies,
            count(DISTINCT (((dep_counts.from_service_namespace)::text || '::'::text) || (dep_counts.from_service_name)::text)) AS services_with_deps,
            max(dep_counts.dep_count) AS max_dependencies
           FROM ( SELECT service_dependencies.from_service_namespace,
                    service_dependencies.from_service_name,
                    count(*) AS dep_count
                   FROM public.service_dependencies
                  GROUP BY service_dependencies.from_service_namespace, service_dependencies.from_service_name) dep_counts
        ), enrichment_stats AS (
         SELECT count(*) FILTER (WHERE (services.external_calls <> '[]'::jsonb)) AS services_with_external_calls,
            count(*) FILTER (WHERE (services.database_calls <> '[]'::jsonb)) AS services_with_db_calls,
            count(*) FILTER (WHERE (services.rpc_calls <> '[]'::jsonb)) AS services_with_rpc_calls,
            count(*) AS total_services
           FROM public.services
        ), alert_stats AS (
         SELECT count(DISTINCT (((alert_incidents.service_namespace)::text || '::'::text) || (alert_incidents.service_name)::text)) AS services_with_alerts,
            count(*) FILTER (WHERE ((alert_incidents.severity)::text = 'critical'::text)) AS critical_alerts,
            count(*) FILTER (WHERE ((alert_incidents.severity)::text = 'warning'::text)) AS warning_alerts,
            count(*) FILTER (WHERE ((alert_incidents.severity)::text = 'fatal'::text)) AS fatal_alerts
           FROM public.alert_incidents
          WHERE ((alert_incidents.status)::text = 'firing'::text)
        ), tag_stats AS (
         SELECT count(*) FILTER (WHERE (array_length(services.tags, 1) > 0)) AS services_with_tags,
            count(*) FILTER (WHERE ('alertmanager-created'::text = ANY (services.tags))) AS alertmanager_created,
            count(*) AS total_services
           FROM public.services
        )
 SELECT ss.total_services,
    ss.active_services,
    ss.stale_services,
    ss.recently_discovered,
    ss.missing_metadata,
    ss.total_namespaces,
    ss.total_environments,
    ds.total_dependencies,
    ds.services_with_deps,
    ds.max_dependencies,
    (ss.total_services - ds.services_with_deps) AS isolated_services,
    es.services_with_external_calls,
    es.services_with_db_calls,
    es.services_with_rpc_calls,
    als.services_with_alerts,
    als.critical_alerts,
    als.warning_alerts,
    als.fatal_alerts,
    ts.services_with_tags,
    ts.alertmanager_created,
        CASE
            WHEN (ss.total_services > 0) THEN round((((ds.services_with_deps)::numeric / (ss.total_services)::numeric) * (100)::numeric))
            ELSE (0)::numeric
        END AS dependency_coverage,
        CASE
            WHEN (ts.total_services > 0) THEN round((((ts.services_with_tags)::numeric / (ts.total_services)::numeric) * (100)::numeric))
            ELSE (0)::numeric
        END AS tag_coverage,
    now() AS last_updated
   FROM service_stats ss,
    dependency_stats ds,
    enrichment_stats es,
    alert_stats als,
    tag_stats ts
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.services_overview_cache OWNER TO postgres;

--
-- Name: alert_events id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alert_events ALTER COLUMN id SET DEFAULT nextval('public.alert_events_id_seq'::regclass);


--
-- Name: alert_incidents id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alert_incidents ALTER COLUMN id SET DEFAULT nextval('public.alert_incidents_id_seq'::regclass);


--
-- Name: namespace_dependencies id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.namespace_dependencies ALTER COLUMN id SET DEFAULT nextval('public.namespace_dependencies_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: alert_events alert_events_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alert_events
    ADD CONSTRAINT alert_events_pkey PRIMARY KEY (id);


--
-- Name: alert_incidents alert_incidents_alert_fingerprint_incident_start_key; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alert_incidents
    ADD CONSTRAINT alert_incidents_alert_fingerprint_incident_start_key UNIQUE (alert_fingerprint, incident_start);


--
-- Name: alert_incidents alert_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alert_incidents
    ADD CONSTRAINT alert_incidents_pkey PRIMARY KEY (id);


--
-- Name: namespace_dependencies namespace_dependencies_from_namespace_to_namespace_key; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.namespace_dependencies
    ADD CONSTRAINT namespace_dependencies_from_namespace_to_namespace_key UNIQUE (from_namespace, to_namespace);


--
-- Name: namespace_dependencies namespace_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.namespace_dependencies
    ADD CONSTRAINT namespace_dependencies_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_migration_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_number_key UNIQUE (migration_number);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_pkey PRIMARY KEY (from_service_namespace, from_service_name, to_service_namespace, to_service_name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_namespace, service_name);




--
-- Name: idx_alert_events_incident; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_events_incident ON public.alert_events USING btree (incident_id, event_time);


--
-- Name: idx_alert_events_incident_time; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_events_incident_time ON public.alert_events USING btree (incident_id, event_time DESC);


--
-- Name: idx_alert_events_time_desc; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_events_time_desc ON public.alert_events USING btree (event_time DESC);


--
-- Name: idx_alert_events_type_time; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_events_type_time ON public.alert_events USING btree (event_type, event_time);


--
-- Name: idx_alert_incidents_acknowledged_at; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_acknowledged_at ON public.alert_incidents USING btree (acknowledged_at);


--
-- Name: idx_alert_incidents_acknowledged_by; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_acknowledged_by ON public.alert_incidents USING btree (acknowledged_by);


--
-- Name: idx_alert_incidents_active; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_active ON public.alert_incidents USING btree (service_namespace, service_name, severity, incident_start DESC) WHERE ((status)::text = 'firing'::text);


--
-- Name: idx_alert_incidents_fingerprint; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_fingerprint ON public.alert_incidents USING btree (alert_fingerprint);


--
-- Name: idx_alert_incidents_fingerprint_time; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_fingerprint_time ON public.alert_incidents USING btree (alert_fingerprint, incident_start DESC);


--
-- Name: idx_alert_incidents_service; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_service ON public.alert_incidents USING btree (service_namespace, service_name);


--
-- Name: idx_alert_incidents_service_severity; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_service_severity ON public.alert_incidents USING btree (service_namespace, service_name, severity);


--
-- Name: idx_alert_incidents_service_status; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_service_status ON public.alert_incidents USING btree (service_namespace, service_name, status);


--
-- Name: idx_alert_incidents_service_time; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_service_time ON public.alert_incidents USING btree (service_namespace, service_name, incident_start DESC);


--
-- Name: idx_alert_incidents_severity; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_severity ON public.alert_incidents USING btree (severity);


--
-- Name: idx_alert_incidents_source; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_source ON public.alert_incidents USING btree (alert_source);


--
-- Name: idx_alert_incidents_start; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_start ON public.alert_incidents USING btree (incident_start);


--
-- Name: idx_alert_incidents_status; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_status ON public.alert_incidents USING btree (status);


--
-- Name: idx_alert_incidents_time_range; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alert_incidents_time_range ON public.alert_incidents USING btree (incident_start, incident_end);


--
-- Name: idx_namespace_deps_from; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_namespace_deps_from ON public.namespace_dependencies USING btree (from_namespace);


--
-- Name: idx_namespace_deps_to; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_namespace_deps_to ON public.namespace_dependencies USING btree (to_namespace);


--
-- Name: idx_namespace_deps_type; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_namespace_deps_type ON public.namespace_dependencies USING btree (dependency_type);


--
-- Name: idx_service_dependencies_from; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_service_dependencies_from ON public.service_dependencies USING btree (from_service_namespace, from_service_name);


--
-- Name: idx_service_dependencies_last_seen; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_service_dependencies_last_seen ON public.service_dependencies USING btree (last_seen);


--
-- Name: idx_service_dependencies_to; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_service_dependencies_to ON public.service_dependencies USING btree (to_service_namespace, to_service_name);


--
-- Name: idx_service_deps_from; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_service_deps_from ON public.service_dependencies USING btree (from_service_namespace, from_service_name);


--
-- Name: idx_service_deps_to; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_service_deps_to ON public.service_dependencies USING btree (to_service_namespace, to_service_name);


--
-- Name: idx_services_component_type; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_component_type ON public.services USING btree (component_type);


--
-- Name: idx_services_created_at; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_created_at ON public.services USING btree (created_at);


--
-- Name: idx_services_environment; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_environment ON public.services USING btree (environment);


--
-- Name: idx_services_last_seen; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_last_seen ON public.services USING btree (last_seen);


--
-- Name: idx_services_namespace; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_namespace ON public.services USING btree (service_namespace);


--
-- Name: idx_services_namespace_name; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_namespace_name ON public.services USING btree (service_namespace, service_name);


--
-- Name: idx_services_tag_sources; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_tag_sources ON public.services USING gin (tag_sources);


--
-- Name: idx_services_tags; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_tags ON public.services USING gin (tags);


--
-- Name: idx_services_tags_gin; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_tags_gin ON public.services USING gin (tags);


--
-- Name: idx_services_team; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_team ON public.services USING btree (team);


--
-- Name: services_overview_cache_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX services_overview_cache_unique ON public.services_overview_cache USING btree (last_updated);


--
-- Name: alert_incidents trigger_alert_incidents_updated_at; Type: TRIGGER; Schema: public; Owner: adalton
--

CREATE TRIGGER trigger_alert_incidents_updated_at BEFORE UPDATE ON public.alert_incidents FOR EACH ROW EXECUTE FUNCTION public.update_alert_incidents_updated_at();


--
-- Name: service_dependencies update_dependencies_last_seen; Type: TRIGGER; Schema: public; Owner: adalton
--

CREATE TRIGGER update_dependencies_last_seen BEFORE UPDATE ON public.service_dependencies FOR EACH ROW EXECUTE FUNCTION public.update_last_seen();


--
-- Name: namespace_dependencies update_namespace_dependencies_updated_at; Type: TRIGGER; Schema: public; Owner: adalton
--

CREATE TRIGGER update_namespace_dependencies_updated_at BEFORE UPDATE ON public.namespace_dependencies FOR EACH ROW EXECUTE FUNCTION public.update_namespace_dependency_updated_at();


--
-- Name: services update_services_last_seen; Type: TRIGGER; Schema: public; Owner: adalton
--

CREATE TRIGGER update_services_last_seen BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_last_seen();


--
-- Name: alert_events alert_events_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alert_events
    ADD CONSTRAINT alert_events_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.alert_incidents(id) ON DELETE CASCADE;


--
-- Name: service_dependencies service_dependencies_from_service_namespace_from_service_n_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_from_service_namespace_from_service_n_fkey FOREIGN KEY (from_service_namespace, from_service_name) REFERENCES public.services(service_namespace, service_name) ON DELETE CASCADE;


--
-- Name: service_dependencies service_dependencies_to_service_namespace_to_service_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_to_service_namespace_to_service_name_fkey FOREIGN KEY (to_service_namespace, to_service_name) REFERENCES public.services(service_namespace, service_name) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


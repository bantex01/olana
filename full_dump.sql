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
-- Name: alerts; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    service_id integer,
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
    CONSTRAINT alerts_severity_check CHECK (((severity)::text = ANY ((ARRAY['fatal'::character varying, 'critical'::character varying, 'warning'::character varying, 'none'::character varying])::text[]))),
    CONSTRAINT alerts_status_check CHECK (((status)::text = ANY ((ARRAY['firing'::character varying, 'resolved'::character varying])::text[])))
);


ALTER TABLE public.alerts OWNER TO adalton;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: adalton
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alerts_id_seq OWNER TO adalton;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adalton
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


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
-- Name: service_dependencies; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.service_dependencies (
    id integer NOT NULL,
    from_service_id integer,
    to_service_id integer,
    created_at timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now()
);


ALTER TABLE public.service_dependencies OWNER TO adalton;

--
-- Name: service_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: adalton
--

CREATE SEQUENCE public.service_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_dependencies_id_seq OWNER TO adalton;

--
-- Name: service_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adalton
--

ALTER SEQUENCE public.service_dependencies_id_seq OWNED BY public.service_dependencies.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: adalton
--

CREATE TABLE public.services (
    id integer NOT NULL,
    service_namespace character varying(255) NOT NULL,
    service_name character varying(255) NOT NULL,
    environment character varying(100),
    team character varying(100),
    component_type character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now(),
    tags text[] DEFAULT '{}'::text[]
);


ALTER TABLE public.services OWNER TO adalton;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: adalton
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO adalton;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adalton
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: namespace_dependencies id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.namespace_dependencies ALTER COLUMN id SET DEFAULT nextval('public.namespace_dependencies_id_seq'::regclass);


--
-- Name: service_dependencies id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies ALTER COLUMN id SET DEFAULT nextval('public.service_dependencies_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: adalton
--

COPY public.alerts (id, service_id, instance_id, severity, message, status, count, first_seen, last_seen, created_at, resolved_at, alert_source, external_alert_id) FROM stdin;
1	1	ing_001	critical	High latency detected - 95th percentile > 5s	firing	9	2025-06-27 13:10:10.578177	2025-06-27 13:28:39.099317	2025-06-27 13:10:10.578177	\N	prometheus	\N
2	2	parser_002	warning	Memory usage at 85%	firing	9	2025-06-27 13:10:10.587583	2025-06-27 13:28:39.106469	2025-06-27 13:10:10.587583	\N	grafana	\N
3	6		fatal	Database connection pool exhausted	firing	9	2025-06-27 13:10:10.601697	2025-06-27 13:28:39.114184	2025-06-27 13:10:10.601697	\N	alertmanager	\N
4	3	transform_001	warning	Queue backlog growing	firing	9	2025-06-27 13:10:10.609223	2025-06-27 13:28:39.121272	2025-06-27 13:10:10.609223	\N	custom	\N
5	3	transform_002	critical	Processing timeout exceeded	firing	9	2025-06-27 13:10:10.616339	2025-06-27 13:28:39.128477	2025-06-27 13:10:10.616339	\N	jaeger	\N
46	129		critical	High response time detected	firing	1	2025-06-28 13:03:48.738699	2025-06-28 13:03:48.738699	2025-06-28 13:03:48.738699	\N	manual	\N
47	132		warning	Queue depth increasing	firing	1	2025-06-28 13:03:48.746812	2025-06-28 13:03:48.746812	2025-06-28 13:03:48.746812	\N	manual	\N
48	1		critical	Memory usage above threshold	firing	1	2025-06-28 13:03:48.753974	2025-06-28 13:03:48.753974	2025-06-28 13:03:48.753974	\N	manual	\N
\.


--
-- Data for Name: namespace_dependencies; Type: TABLE DATA; Schema: public; Owner: adalton
--

COPY public.namespace_dependencies (id, from_namespace, to_namespace, created_by, dependency_type, description, created_at, updated_at) FROM stdin;
1	Frontend	MetaSetter	test-script	business	Frontend services depend on MetaSetter APIs for data processing	2025-06-28 13:03:48.70743	2025-06-28 13:03:48.70743
2	Analytics	Payments	test-script	data-flow	Analytics processes payment data for reporting	2025-06-28 13:03:48.717245	2025-06-28 13:03:48.717245
3	Frontend	Payments	test-script	business	Frontend needs payment services for transactions	2025-06-28 13:03:48.72388	2025-06-28 13:03:48.72388
\.


--
-- Data for Name: service_dependencies; Type: TABLE DATA; Schema: public; Owner: adalton
--

COPY public.service_dependencies (id, from_service_id, to_service_id, created_at, last_seen) FROM stdin;
46	3	1	2025-06-27 13:28:39.071563	2025-06-27 13:28:39.071563
47	3	2	2025-06-27 13:28:39.071563	2025-06-27 13:28:39.071563
48	7	6	2025-06-27 13:28:39.090374	2025-06-27 13:28:39.090374
49	130	1	2025-06-28 13:03:48.604944	2025-06-28 13:03:48.604944
50	133	132	2025-06-28 13:03:48.63542	2025-06-28 13:03:48.63542
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: adalton
--

COPY public.services (id, service_namespace, service_name, environment, team, component_type, created_at, last_seen, tags) FROM stdin;
129	Frontend	web-app	prod	Frontend	service	2025-06-28 13:03:48.591231	2025-06-28 13:03:48.591231	{frontend,critical,user-facing}
130	Frontend	api-gateway	prod	Platform	service	2025-06-28 13:03:48.604944	2025-06-28 13:03:48.604944	{frontend,gateway,critical}
133	Analytics	data-pipeline	prod	Data	service	2025-06-28 13:03:48.63542	2025-06-28 13:03:48.63542	{backend,batch,analytics}
132	Payments	payment-processor	prod	Payments	service	2025-06-28 13:03:48.627092	2025-06-28 13:03:48.63542	{backend,critical,financial}
1	MetaSetter	ingester	prod	SRE	service	2025-06-27 12:31:43.05487	2025-06-28 13:03:48.643783	{backend,ingestion,high-volume}
2	MetaSetter	parser	prod	SRE	service	2025-06-27 12:31:43.071187	2025-06-28 13:03:48.650413	{backend,processing,data-transformation}
135	Legacy	old-service	prod	Legacy	service	2025-06-28 13:03:48.788998	2025-06-28 13:03:48.788998	{}
3	MetaSetter	transformer	prod	SRE	service	2025-06-27 12:31:43.078699	2025-06-27 13:28:39.071563	{}
7	MetaSetter	storage	prod	SRE	service	2025-06-27 12:31:43.106538	2025-06-27 13:28:39.090374	{}
6	Infrastructure	postgres	prod	Platform	database	2025-06-27 12:31:43.099681	2025-06-27 13:28:39.090374	{}
\.


--
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adalton
--

SELECT pg_catalog.setval('public.alerts_id_seq', 48, true);


--
-- Name: namespace_dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adalton
--

SELECT pg_catalog.setval('public.namespace_dependencies_id_seq', 3, true);


--
-- Name: service_dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adalton
--

SELECT pg_catalog.setval('public.service_dependencies_id_seq', 50, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adalton
--

SELECT pg_catalog.setval('public.services_id_seq', 135, true);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_service_id_instance_id_severity_message_key; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_service_id_instance_id_severity_message_key UNIQUE (service_id, instance_id, severity, message);


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
-- Name: service_dependencies service_dependencies_from_service_id_to_service_id_key; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_from_service_id_to_service_id_key UNIQUE (from_service_id, to_service_id);


--
-- Name: service_dependencies service_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: services services_service_namespace_service_name_key; Type: CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_service_namespace_service_name_key UNIQUE (service_namespace, service_name);


--
-- Name: idx_alerts_active; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alerts_active ON public.alerts USING btree (status, created_at) WHERE ((status)::text = 'firing'::text);


--
-- Name: idx_alerts_service; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alerts_service ON public.alerts USING btree (service_id, status);


--
-- Name: idx_alerts_severity; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_alerts_severity ON public.alerts USING btree (severity, status);


--
-- Name: idx_dependencies_from; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_dependencies_from ON public.service_dependencies USING btree (from_service_id);


--
-- Name: idx_dependencies_to; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_dependencies_to ON public.service_dependencies USING btree (to_service_id);


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
-- Name: idx_services_last_seen; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_last_seen ON public.services USING btree (last_seen);


--
-- Name: idx_services_lookup; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_lookup ON public.services USING btree (service_namespace, service_name);


--
-- Name: idx_services_tags; Type: INDEX; Schema: public; Owner: adalton
--

CREATE INDEX idx_services_tags ON public.services USING gin (tags);


--
-- Name: alerts update_alerts_last_seen; Type: TRIGGER; Schema: public; Owner: adalton
--

CREATE TRIGGER update_alerts_last_seen BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.update_alert_last_seen();


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
-- Name: alerts alerts_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: service_dependencies service_dependencies_from_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_from_service_id_fkey FOREIGN KEY (from_service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: service_dependencies service_dependencies_to_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adalton
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_to_service_id_fkey FOREIGN KEY (to_service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


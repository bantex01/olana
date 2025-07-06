
# Technical Summary: My Graph Tool

## 1. Application Overview

This document provides a technical summary of the My Graph Tool application, targeted at Site Reliability Engineers (SREs). The application is a real-time service monitoring and visualization platform. It ingests telemetry data from services, tracks their dependencies, and correlates them with alerts. This allows SREs to visualize the service landscape, understand dependencies, and quickly assess the impact of alerts.

## 2. Architecture

The application follows a standard web application architecture:

*   **Backend:** A Node.js application built with Express.js, responsible for data ingestion, processing, and serving the API.
*   **Database:** A PostgreSQL database is used for data persistence. The backend utilizes a connection pool for efficient database access.
*   **Frontend:** A React application built with Vite, which consumes the backend API to render the service graph and alert information.

## 3. Data Ingestion and Processing

The application is designed to handle high-volume data ingestion through two primary endpoints: `/telemetry` and `/alerts`.

### 3.1. Telemetry Ingestion

*   **Endpoint:** `POST /telemetry`
*   **Purpose:** To ingest service information and their dependencies.
*   **Payload:** A JSON object representing a `Telemetry` entity, which includes:
    *   `service_namespace`, `service_name`, `environment`, `team`, `component_type`, `tags`
    *   `depends_on`: An array of services that the reporting service depends on.
*   **Processing:**
    *   The endpoint uses a database transaction to ensure atomicity.
    *   It performs an `UPSERT` (`INSERT ... ON CONFLICT ... DO UPDATE`) operation on the `services` table. This is highly efficient as it avoids a separate read query to check for the existence of a service.
    *   For each incoming telemetry payload, it clears all existing dependencies for that service and inserts the new ones. This ensures that the dependency map is always up-to-date.

### 3.2. Alert Ingestion and Deduplication

*   **Endpoint:** `POST /alerts`
*   **Purpose:** To ingest alerts and perform deduplication.
*   **Payload:** A JSON object representing an `Alert` entity, which includes:
    *   `service_namespace`, `service_name`, `severity`, `message`, `instance_id`, etc.
*   **Processing:**
    *   If the service associated with the alert does not exist, it is created on-the-fly.
    *   Alert deduplication is achieved using an `UPSERT` operation with a conflict clause on the combination of `(service_id, instance_id, severity, message)`.
    *   If a new alert is received that matches an existing, active alert, instead of creating a new row, a `count` column is incremented, and the `last_seen` timestamp is updated. This prevents alert storms from overwhelming the system and provides a clear count of how many times an alert has fired.

## 4. Service and Dependency Mapping

The application maps services and their dependencies in two ways:

*   **Service-level dependencies:** These are explicitly defined in the `depends_on` array of the `/telemetry` endpoint payload. This data is stored in the `service_dependencies` table.
*   **Namespace-level dependencies:** The application supports a higher-level abstraction of dependencies between service namespaces. These are managed via the `/namespace-dependencies` endpoints and are stored in the `namespace_dependencies` table. The `/graph` endpoint can use these to show a more comprehensive view of the service landscape, including the "blast radius" of a particular namespace.

## 5. API Endpoints

The following are the key API endpoints provided by the backend:

| Method | Path                               | Description                                                                                                                              |
| :----- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/telemetry`                       | Ingests service telemetry data.                                                                                                          |
| `POST` | `/alerts`                          | Ingests alert data with deduplication.                                                                                                   |
| `GET`  | `/graph`                           | Retrieves data for rendering the service dependency graph. Supports filtering by tags, namespaces, and severities.                       |
| `GET`  | `/alerts`                          | Retrieves a list of active alerts. Supports filtering by tags, namespaces, and severities.                                               |
| `PUT`  | `/services/:namespace/:name/tags`  | Updates the tags for a specific service.                                                                                                 |
| `GET`  | `/tags`                            | Retrieves all unique tags from the system.                                                                                               |
| `POST` | `/namespace-dependencies`          | Creates a dependency between two namespaces.                                                                                             |
| `GET`  | `/namespace-dependencies`          | Retrieves all namespace dependencies.                                                                                                    |
| `DELETE`| `/namespace-dependencies/:id`      | Deletes a namespace dependency.                                                                                                          |
| `PATCH`| `/alerts/:alertId/resolve`         | Resolves an active alert.                                                                                                                |
| `GET`  | `/health`                          | Health check endpoint.                                                                                                                   |

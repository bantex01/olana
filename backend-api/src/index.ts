import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alert_hub',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

type Telemetry = {
  service_namespace: string;
  service_name: string;
  environment: string;
  team: string;
  component_type: string;
  depends_on: { service_namespace: string; service_name: string }[];
};

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string;
  severity: "fatal" | "critical" | "warning" | "none";
  message: string;
  alert_source?: string;
  external_alert_id?: string;
};

// Upsert service and update dependencies
app.post("/telemetry", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const t = req.body as Telemetry;
    
    // Upsert service (insert or update last_seen)
    const serviceResult = await client.query(`
      INSERT INTO services (service_namespace, service_name, environment, team, component_type, last_seen)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (service_namespace, service_name)
      DO UPDATE SET 
        environment = EXCLUDED.environment,
        team = EXCLUDED.team,
        component_type = EXCLUDED.component_type,
        last_seen = NOW()
      RETURNING id
    `, [t.service_namespace, t.service_name, t.environment, t.team, t.component_type]);
    
    const serviceId = serviceResult.rows[0].id;
    
    // Clear existing dependencies for this service
    await client.query('DELETE FROM service_dependencies WHERE from_service_id = $1', [serviceId]);
    
    // Insert new dependencies
    for (const dep of t.depends_on) {
      // Find or create target service
      const targetResult = await client.query(`
        INSERT INTO services (service_namespace, service_name, last_seen)
        VALUES ($1, $2, NOW())
        ON CONFLICT (service_namespace, service_name)
        DO UPDATE SET last_seen = NOW()
        RETURNING id
      `, [dep.service_namespace, dep.service_name]);
      
      const targetServiceId = targetResult.rows[0].id;
      
      // Create dependency
      await client.query(`
        INSERT INTO service_dependencies (from_service_id, to_service_id, last_seen)
        VALUES ($1, $2, NOW())
        ON CONFLICT (from_service_id, to_service_id)
        DO UPDATE SET last_seen = NOW()
      `, [serviceId, targetServiceId]);
    }
    
    await client.query('COMMIT');
    res.json({ status: "ok" });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Telemetry error:', error);
    res.status(500).json({ error: "Failed to process telemetry" });
  } finally {
    client.release();
  }
});

// Create new alert
app.post("/alerts", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const a = req.body as Alert;
    
    // Find the service
    const serviceResult = await client.query(
      'SELECT id FROM services WHERE service_namespace = $1 AND service_name = $2',
      [a.service_namespace, a.service_name]
    );
    
    if (serviceResult.rows.length === 0) {
      // Create service if it doesn't exist
      const newServiceResult = await client.query(`
        INSERT INTO services (service_namespace, service_name, last_seen)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [a.service_namespace, a.service_name]);
      
      const serviceId = newServiceResult.rows[0].id;
      
      await client.query(`
        INSERT INTO alerts (service_id, instance_id, severity, message, alert_source, external_alert_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [serviceId, a.instance_id, a.severity, a.message, a.alert_source || 'manual', a.external_alert_id]);
    } else {
      const serviceId = serviceResult.rows[0].id;
      
      await client.query(`
        INSERT INTO alerts (service_id, instance_id, severity, message, alert_source, external_alert_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [serviceId, a.instance_id, a.severity, a.message, a.alert_source || 'manual', a.external_alert_id]);
    }
    
    res.json({ status: "ok" });
    
  } catch (error) {
    console.error('Alert error:', error);
    res.status(500).json({ error: "Failed to create alert" });
  } finally {
    client.release();
  }
});

// Generate graph data
app.get("/graph", async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get all services
    const servicesResult = await client.query(`
      SELECT 
        s.id,
        s.service_namespace,
        s.service_name,
        s.environment,
        s.team,
        s.component_type
      FROM services s
      ORDER BY s.service_namespace, s.service_name
    `);
    
    // Get all dependencies
    const dependenciesResult = await client.query(`
      SELECT 
        fs.service_namespace || '::' || fs.service_name as from_service,
        ts.service_namespace || '::' || ts.service_name as to_service
      FROM service_dependencies sd
      JOIN services fs ON sd.from_service_id = fs.id
      JOIN services ts ON sd.to_service_id = ts.id
    `);
    
    const nodes: any[] = [];
    const edges: any[] = [];
    const seen = new Set<string>();
    
    // Create namespace and service nodes
    servicesResult.rows.forEach((service: any) => {
      const nsNodeId = service.service_namespace;
      const serviceNodeId = `${service.service_namespace}::${service.service_name}`;
      
      // Create namespace node
      if (!seen.has(nsNodeId)) {
        nodes.push({
          id: nsNodeId,
          label: service.service_namespace,
          color: "#888",
          shape: "ellipse",
          nodeType: "namespace"
        });
        seen.add(nsNodeId);
      }
      
      // Create service node
      if (!seen.has(serviceNodeId)) {
        nodes.push({
          id: serviceNodeId,
          label: service.service_name,
          shape: "box",
          color: "#D3D3D3",
          team: service.team,
          environment: service.environment,
          component_type: service.component_type,
          nodeType: "service"
        });
        
        // Add edge from namespace to service
        edges.push({ from: nsNodeId, to: serviceNodeId });
        seen.add(serviceNodeId);
      }
    });
    
    // Create dependency edges
    dependenciesResult.rows.forEach((dep: any) => {
      const edgeId = `${dep.from_service}-->${dep.to_service}`;
      
      if (!edges.find(e => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          from: dep.from_service,
          to: dep.to_service,
          color: { color: "#2B7CE9" },
          width: 2,
          arrows: { from: { enabled: true }, to: { enabled: false } },
          title: "depends_on",
          edgeType: "dependency"
        });
      }
    });
    
    res.json({ nodes, edges });
    
  } catch (error) {
    console.error('Graph error:', error);
    res.status(500).json({ error: "Failed to generate graph" });
  } finally {
    client.release();
  }
});

// Get all active alerts
app.get("/alerts", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const alertsResult = await client.query(`
      SELECT 
        s.service_namespace,
        s.service_name,
        a.instance_id,
        a.severity,
        a.message,
        a.status,
        a.created_at,
        a.resolved_at
      FROM alerts a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'firing'
      ORDER BY a.created_at DESC
    `);
    
    const alerts = alertsResult.rows.map((row: any) => ({
      service_namespace: row.service_namespace,
      service_name: row.service_name,
      instance_id: row.instance_id,
      severity: row.severity,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      resolved_at: row.resolved_at
    }));
    
    res.json(alerts);
    
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  } finally {
    client.release();
  }
});

// Additional endpoint to resolve alerts
app.patch("/alerts/:alertId/resolve", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const alertId = parseInt(req.params.alertId);
    
    await client.query(`
      UPDATE alerts 
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 AND status = 'firing'
    `, [alertId]);
    
    res.json({ status: "ok" });
    
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: "Failed to resolve alert" });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", database: "disconnected" });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database connection pool initialized');
});
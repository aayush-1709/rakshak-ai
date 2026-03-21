const { Client, Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Please set it in backend/.env');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

function extractDbName(connectionString) {
  const parsed = new URL(connectionString);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
}

function buildAdminConnectionString(connectionString) {
  const parsed = new URL(connectionString);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

async function ensureDatabaseExists() {
  const probeClient = new Client({ connectionString: DATABASE_URL });
  try {
    await probeClient.connect();
    await probeClient.end();
    return;
  } catch (error) {
    try {
      await probeClient.end();
    } catch {
      // ignore close errors
    }
    if (!(error && error.code === '3D000')) {
      throw error;
    }
  }

  const targetDb = extractDbName(DATABASE_URL);
  const adminClient = new Client({
    connectionString: buildAdminConnectionString(DATABASE_URL),
  });

  await adminClient.connect();
  try {
    const existsResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (existsResult.rowCount === 0) {
      const escapedDbName = targetDb.replace(/"/g, '""');
      await adminClient.query(`CREATE DATABASE "${escapedDbName}"`);
    }
  } finally {
    await adminClient.end();
  }
}

async function initDb() {
  await ensureDatabaseExists();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      complaint_id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      description TEXT NOT NULL,
      pincode TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      status TEXT NOT NULL,
      address TEXT NOT NULL,
      image_data_url TEXT,
      video_data_url TEXT,
      ai_summary TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      confidence_score DOUBLE PRECISION NOT NULL DEFAULT 80,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS video_data_url TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_complaints_cluster_id ON complaints(cluster_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_complaints_pincode ON complaints(pincode);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS corruption_reports (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      reporter_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      accused_person TEXT NOT NULL DEFAULT '',
      proof_data_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_corruption_reports_created_at ON corruption_reports(created_at DESC);
  `);
}

function mapRow(row) {
  return {
    complaint_id: row.complaint_id,
    cluster_id: row.cluster_id,
    issue_type: row.issue_type,
    description: row.description,
    pincode: row.pincode,
    risk_level: row.risk_level,
    status: row.status,
    address: row.address,
    image_data_url: row.image_data_url || undefined,
    video_data_url: row.video_data_url || undefined,
    ai_summary: row.ai_summary || undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    confidence_score: Number(row.confidence_score),
    created_at: new Date(row.created_at).toISOString(),
  };
}

async function getComplaints() {
  const result = await pool.query(
    `SELECT complaint_id, cluster_id, issue_type, description, pincode, risk_level, status, address,
            image_data_url, video_data_url, ai_summary, latitude, longitude, confidence_score, created_at
     FROM complaints
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapRow);
}

async function deleteComplaintById(complaintId) {
  const result = await pool.query('DELETE FROM complaints WHERE complaint_id = $1', [complaintId]);
  return result.rowCount > 0;
}

async function addComplaint(complaint) {
  await pool.query(
    `INSERT INTO complaints (
      complaint_id, cluster_id, issue_type, description, pincode, risk_level, status, address,
      image_data_url, video_data_url, ai_summary, latitude, longitude, confidence_score, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15
    )`,
    [
      complaint.complaint_id,
      complaint.cluster_id,
      complaint.issue_type,
      complaint.description,
      complaint.pincode,
      complaint.risk_level,
      complaint.status,
      complaint.address,
      complaint.image_data_url || null,
      complaint.video_data_url || null,
      complaint.ai_summary || null,
      complaint.latitude,
      complaint.longitude,
      complaint.confidence_score ?? 80,
      complaint.created_at ? new Date(complaint.created_at) : new Date(),
    ]
  );
  return complaint;
}

function mapCorruptionRow(row) {
  return {
    id: row.id,
    description: row.description,
    reporter_name: row.reporter_name,
    phone: row.phone,
    department: row.department,
    accused_person: row.accused_person,
    proof_data_url: row.proof_data_url || undefined,
    created_at: new Date(row.created_at).toISOString(),
  };
}

async function addCorruptionReport(report) {
  await pool.query(
    `INSERT INTO corruption_reports (
      id, description, reporter_name, phone, department, accused_person, proof_data_url, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      report.id,
      report.description,
      report.reporter_name,
      report.phone,
      report.department,
      report.accused_person,
      report.proof_data_url || null,
      report.created_at ? new Date(report.created_at) : new Date(),
    ]
  );
  return report;
}

async function getCorruptionReports() {
  const result = await pool.query(
    `SELECT id, description, reporter_name, phone, department, accused_person, proof_data_url, created_at
     FROM corruption_reports
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapCorruptionRow);
}

module.exports = {
  initDb,
  getComplaints,
  addComplaint,
  deleteComplaintById,
  addCorruptionReport,
  getCorruptionReports,
};

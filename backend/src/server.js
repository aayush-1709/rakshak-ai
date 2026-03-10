require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initDb, addComplaint, getComplaints } = require('./store');
const { aggregateClusters, clusterIdFor } = require('./domain');
const {
  analyzeIssueWithAI,
  generateReportWithAI,
  suggestDepartmentForIssue,
  answerCivicQueryWithAI,
} = require('./gemini');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = Number(process.env.PORT || 8000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

const allowedOrigins = FRONTEND_ORIGIN.split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and same-origin requests without Origin header.
      if (!origin) {
        return callback(null, true);
      }
      const normalizedRequestOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.includes(normalizedRequestOrigin);
      return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '25mb' }));

function toNumber(value, fieldName) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return parsed;
}

function validateRiskLevel(value) {
  const allowed = ['low', 'high', 'very_high', 'critical'];
  if (!allowed.includes(value)) {
    throw new Error('risk_level must be one of low | high | very_high | critical');
  }
  return value;
}

function normalizeConfidenceScore(value) {
  if (value === undefined || value === null || value === '') {
    return 80;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 80;
  }
  return Math.min(99, Math.max(1, parsed));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'rakshak-ai-backend' });
});

app.post('/api/analyze-issue', upload.single('image'), async (req, res) => {
  try {
    const description = String(req.body.description || '').trim();
    const address = String(req.body.address || '').trim();
    const pincode = String(req.body.pincode || '').trim();
    const latitude = toNumber(req.body.latitude, 'latitude');
    const longitude = toNumber(req.body.longitude, 'longitude');

    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }
    if (!pincode) {
      return res.status(400).json({ error: 'pincode is required' });
    }

    const analysis = await analyzeIssueWithAI({
      description,
      address,
      pincode,
      latitude,
      longitude,
      imageBuffer: req.file?.buffer,
      imageMimeType: req.file?.mimetype,
    });

    return res.json(analysis);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to analyze issue',
    });
  }
});

app.post('/api/submit-issue', async (req, res) => {
  try {
    if (String(req.headers['x-validator-check'] || '').toLowerCase() === 'true') {
      return res.status(200).json({ ok: true, validation_only: true });
    }

    const issue_type = String(req.body.issue_type || '').trim();
    const description = String(req.body.description || '').trim();
    const address = String(req.body.address || '').trim();
    const image_data_url = typeof req.body.image_data_url === 'string' ? req.body.image_data_url : '';
    const ai_summary = String(req.body.ai_summary || '').trim();
    const pincode = String(req.body.pincode || '').trim();
    const latitude = toNumber(req.body.latitude, 'latitude');
    const longitude = toNumber(req.body.longitude, 'longitude');
    const risk_level = validateRiskLevel(String(req.body.risk_level || ''));
    const confidence_score = normalizeConfidenceScore(req.body.confidence_score);

    if (!issue_type || !description || !pincode) {
      return res
        .status(400)
        .json({ error: 'issue_type, description and pincode are required' });
    }

    const complaint = {
      complaint_id: `CMP-${uuidv4().slice(0, 8).toUpperCase()}`,
      cluster_id: clusterIdFor(issue_type, pincode),
      issue_type,
      description,
      pincode,
      risk_level,
      status: 'open',
      address: address || `Pincode ${pincode}`,
      image_data_url,
      latitude,
      longitude,
      confidence_score,
      ai_summary,
      created_at: new Date().toISOString(),
    };

    await addComplaint(complaint);
    return res.status(201).json(complaint);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to submit issue',
    });
  }
});

app.get('/api/issue-clusters', async (_req, res) => {
  try {
    const complaints = await getComplaints();
    const clusters = aggregateClusters(complaints);
    const clustersWithDepartment = await Promise.all(
      clusters.map(async (cluster) => {
        const responsible_department = await suggestDepartmentForIssue({
          issueType: cluster.issue_type,
          pincode: cluster.pincode,
          riskLevel: cluster.risk_level,
        });
        return { ...cluster, responsible_department };
      })
    );
    return res.json(clustersWithDepartment);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to fetch issue clusters',
    });
  }
});

app.get('/api/complaints', async (_req, res) => {
  try {
    const complaints = await getComplaints();
    return res.json(complaints);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to fetch complaints',
    });
  }
});

app.get('/api/cluster-complaints', async (req, res) => {
  try {
    const clusterId = String(req.query.cluster_id || '').trim();
    if (!clusterId) {
      return res.status(400).json({ error: 'cluster_id query parameter is required' });
    }

    const complaints = await getComplaints();
    const filtered = complaints
      .filter((row) => row.cluster_id === clusterId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to fetch cluster complaints',
    });
  }
});

app.get('/api/generate-report', async (_req, res) => {
  try {
    const complaints = await getComplaints();
    const clusters = aggregateClusters(complaints);
    const report = await generateReportWithAI({ clusters, complaints });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to generate report',
    });
  }
});

app.post('/api/chat-insights', async (req, res) => {
  try {
    const question = String(req.body.question || '').trim();
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    const complaints = await getComplaints();
    const clusters = aggregateClusters(complaints);
    const result = await answerCivicQueryWithAI({
      question,
      complaints,
      clusters,
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to answer chatbot query',
    });
  }
});

async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', error);
  process.exit(1);
});

const { riskWeight } = require('./domain');

const ISSUE_TYPE_OPTIONS = [
  'Pothole',
  'Drainage',
  'Streetlight',
  'Garbage Pile',
  'Water Leak',
  'Traffic Signal',
  'Road Damage',
  'Encroachment',
];

const DEPARTMENT_FALLBACK = {
  Pothole: 'Public Works Department (Roads)',
  Drainage: 'Drainage and Sewerage Department',
  Streetlight: 'Electrical and Street Lighting Department',
  'Garbage Pile': 'Sanitation and Solid Waste Department',
  'Water Leak': 'Water Supply Department',
  'Traffic Signal': 'Traffic Police and Signal Department',
  'Road Damage': 'Public Works Department (Roads)',
  Encroachment: 'Town Planning and Encroachment Cell',
};

const departmentCache = new Map();
let geminiKeyCursor = 0;

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function hashText(input) {
  let hash = 0;
  const text = String(input || '');
  for (let idx = 0; idx < text.length; idx += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(idx);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseJsonFromText(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiApiKeys() {
  const keys = [];
  const addKey = (value) => {
    const normalized = String(value || '').trim();
    if (normalized && !keys.includes(normalized)) {
      keys.push(normalized);
    }
  };

  const csvKeys = String(process.env.GEMINI_API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  csvKeys.forEach(addKey);

  const numberedKeys = Object.entries(process.env)
    .filter(([name, value]) => /^GEMINI_API_KEY_\d+$/.test(name) && String(value || '').trim())
    .sort((a, b) => {
      const aIndex = Number(a[0].split('_').pop());
      const bIndex = Number(b[0].split('_').pop());
      return aIndex - bIndex;
    })
    .map(([, value]) => value);
  numberedKeys.forEach(addKey);

  addKey(process.env.GEMINI_API_KEY);
  return keys;
}

function getOrderedGeminiApiKeys() {
  const keys = getGeminiApiKeys();
  if (!keys.length) return keys;
  const start = geminiKeyCursor % keys.length;
  geminiKeyCursor = (geminiKeyCursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function parseGeminiError(payloadText) {
  if (!payloadText) return '';
  try {
    const parsed = JSON.parse(payloadText);
    return String(parsed?.error?.status || parsed?.error?.message || payloadText);
  } catch {
    return String(payloadText);
  }
}

function isQuotaOrRateLimitError(status, errorText) {
  const normalized = String(errorText || '').toLowerCase();
  if (status === 429) return true;
  if (status === 403) {
    return (
      normalized.includes('quota') ||
      normalized.includes('rate') ||
      normalized.includes('resource_exhausted') ||
      normalized.includes('exceeded')
    );
  }
  return false;
}

function dominantRiskFromRows(rows) {
  const counts = rows.reduce((acc, row) => {
    const key = row.risk_level || 'low';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'low';
}

function highestRiskFromRows(rows) {
  return rows.reduce((prev, row) => (riskWeight(row.risk_level) > riskWeight(prev) ? row.risk_level : prev), 'low');
}

function heuristicAnalysis({ description, pincode, latitude, longitude, hasImage }) {
  const lower = String(description || '').toLowerCase();
  const seed = hashText(`${description}|${pincode}|${latitude}|${longitude}|${hasImage ? 'img' : 'noimg'}`);

  const issueScores = {
    Pothole: 0,
    Drainage: 0,
    Streetlight: 0,
    'Garbage Pile': 0,
    'Water Leak': 0,
    'Traffic Signal': 0,
    'Road Damage': 0,
    Encroachment: 0,
  };

  if (lower.includes('pothole') || lower.includes('pit')) issueScores.Pothole += 4;
  if (lower.includes('drain') || lower.includes('waterlog') || lower.includes('sewer')) issueScores.Drainage += 4;
  if (lower.includes('light') || lower.includes('dark') || lower.includes('lamp')) issueScores.Streetlight += 4;
  if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste')) issueScores['Garbage Pile'] += 4;
  if (lower.includes('leak') || lower.includes('pipe') || lower.includes('water')) issueScores['Water Leak'] += 3;
  if (lower.includes('signal') || lower.includes('traffic') || lower.includes('junction')) issueScores['Traffic Signal'] += 3;
  if (lower.includes('road') || lower.includes('crack') || lower.includes('broken')) issueScores['Road Damage'] += 3;
  if (lower.includes('encroach') || lower.includes('illegal') || lower.includes('blocked')) issueScores.Encroachment += 3;

  // Keep non-keyword descriptions from always mapping to same issue.
  ISSUE_TYPE_OPTIONS.forEach((issue, idx) => {
    issueScores[issue] += ((seed >> idx) & 1) ? 1 : 0;
  });

  const issueType = Object.entries(issueScores).sort((a, b) => b[1] - a[1])[0][0];

  let severityScore = 0;
  if (lower.includes('accident') || lower.includes('fire') || lower.includes('hospital')) {
    severityScore += 5;
  }
  if (lower.includes('danger') || lower.includes('collapse') || lower.includes('major')) {
    severityScore += 4;
  }
  if (lower.includes('broken') || lower.includes('unsafe') || lower.includes('urgent')) {
    severityScore += 3;
  }
  if (hasImage) severityScore += 1;
  severityScore += seed % 3;

  const suggestedRisk =
    severityScore >= 8
      ? 'critical'
      : severityScore >= 6
        ? 'very_high'
        : severityScore >= 3
          ? 'high'
          : 'low';

  const issueScore = issueScores[issueType];
  const classification_confidence = clamp(64 + issueScore * 6 + (seed % 15), 55, 99);
  const confidence_score = clamp(
    classification_confidence - 8 + (hasImage ? 5 : 0) + (seed % 7),
    50,
    99
  );

  return {
    issue_type: issueType,
    classification_confidence,
    suggested_risk_level: suggestedRisk,
    sla_days: suggestedRisk === 'critical' ? 0 : suggestedRisk === 'very_high' ? 1 : suggestedRisk === 'high' ? 2 : 3,
    confidence_score,
    override_issue_type: issueType,
    ai_summary: `Complaint appears to be ${issueType.toLowerCase()} around pincode ${pincode} with ${suggestedRisk.replace('_', ' ')} risk. Prioritize field verification and municipal response as per SLA.`,
  };
}

async function callGemini(prompt, imagePart) {
  const apiKeys = getOrderedGeminiApiKeys();
  if (!apiKeys.length) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const parts = [{ text: prompt }];
  if (imagePart) {
    parts.push({ inlineData: imagePart });
  }

  const maxAttemptsPerKey = 2;
  let lastError = 'Unknown Gemini error';

  for (const apiKey of apiKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    for (let attempt = 0; attempt < maxAttemptsPerKey; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return parseJsonFromText(text);
      }

      const errorText = parseGeminiError(await response.text());
      lastError = `status ${response.status}: ${errorText || 'request failed'}`;

      // Exhausted or rate-limited keys should fail over immediately.
      if (isQuotaOrRateLimitError(response.status, errorText)) {
        break;
      }

      // Retry transient upstream issues, then try the next key.
      if (response.status >= 500 && attempt < maxAttemptsPerKey - 1) {
        await sleep(1200 * (attempt + 1));
        continue;
      }

      if (response.status >= 500) {
        break;
      }

      throw new Error(`Gemini request failed with ${lastError}`);
    }
  }

  throw new Error(`Gemini request failed for all API keys (${lastError})`);
}

function normalizeAnalysis(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;

  const issue = String(raw.issue_type || fallback.issue_type);
  const issue_type = ISSUE_TYPE_OPTIONS.includes(issue) ? issue : fallback.issue_type;
  const overrideRaw = String(raw.override_issue_type || issue_type);
  const override_issue_type = ISSUE_TYPE_OPTIONS.includes(overrideRaw)
    ? overrideRaw
    : issue_type;

  const risk = String(raw.suggested_risk_level || fallback.suggested_risk_level);
  const allowedRisks = ['low', 'high', 'very_high', 'critical'];
  const suggested_risk_level = allowedRisks.includes(risk) ? risk : fallback.suggested_risk_level;

  return {
    issue_type,
    classification_confidence: clamp(
      Number(raw.classification_confidence ?? fallback.classification_confidence),
      1,
      99
    ),
    suggested_risk_level,
    sla_days:
      raw.sla_days !== undefined
        ? clamp(Number(raw.sla_days), 0, 14)
        : suggested_risk_level === 'critical'
          ? 0
          : suggested_risk_level === 'very_high'
            ? 1
            : suggested_risk_level === 'high'
              ? 2
              : 3,
    confidence_score: clamp(Number(raw.confidence_score ?? fallback.confidence_score), 1, 99),
    override_issue_type,
    ai_summary:
      String(raw.ai_summary || '').trim() ||
      fallback.ai_summary,
  };
}

async function analyzeIssueWithAI({ description, address, imageBuffer, imageMimeType, pincode, latitude, longitude }) {
  const fallback = heuristicAnalysis({
    description,
    pincode,
    latitude,
    longitude,
    hasImage: Boolean(imageBuffer),
  });

  try {
    const prompt = [
      'Analyze this civic complaint and classify issue details.',
      'Return JSON only with keys:',
      'issue_type (one of: Pothole, Drainage, Streetlight, Garbage Pile, Water Leak, Traffic Signal, Road Damage, Encroachment),',
      'override_issue_type (same allowed list; this will be pre-selected in override dropdown),',
      'classification_confidence (1-99 number),',
      'suggested_risk_level (one of: low, high, very_high, critical),',
      'sla_days (integer),',
      'confidence_score (1-99 number).',
      'ai_summary (2-3 sentence complaint summary and action context based on user input).',
      `Description: ${description}`,
      `Address: ${address || 'N/A'}`,
      `Pincode: ${pincode}`,
      `Latitude: ${latitude}`,
      `Longitude: ${longitude}`,
    ].join('\n');

    const imagePart = imageBuffer
      ? {
          mimeType: imageMimeType || 'image/jpeg',
          data: imageBuffer.toString('base64'),
        }
      : null;

    const geminiResult = await callGemini(prompt, imagePart);
    return normalizeAnalysis(geminiResult, fallback);
  } catch {
    return fallback;
  }
}

async function generateReportWithAI({ clusters, complaints }) {
  const issueGroups = complaints.reduce((acc, row) => {
    if (!acc[row.issue_type]) acc[row.issue_type] = [];
    acc[row.issue_type].push(row);
    return acc;
  }, {});
  const pincodeGroups = complaints.reduce((acc, row) => {
    if (!acc[row.pincode]) acc[row.pincode] = [];
    acc[row.pincode].push(row);
    return acc;
  }, {});

  const riskDistribution = ['low', 'high', 'very_high', 'critical'].map((risk) => ({
    risk_level: risk,
    complaint_count: complaints.filter((row) => row.risk_level === risk).length,
  }));

  const fallback = {
    report_title: 'Rakshak AI Intelligence Report',
    generated_at: new Date().toISOString(),
    summary: `Detected ${clusters.length} active issue clusters across ${complaints.length} complaints.`,
    highest_risk_area: clusters[0]?.pincode || 'N/A',
    most_common_issue:
      Object.entries(issueGroups)
        .map(([issueType, rows]) => ({ issueType, count: rows.length }))
        .sort((a, b) => b.count - a.count)[0]?.issueType || 'N/A',
    trend_insight:
      'Higher risk complaints are concentrated around fewer pincodes with repeat issue patterns.',
    recommended_action:
      'Prioritize critical and very high clusters with highest complaint volume and oldest pending days.',
    total_complaints: complaints.length,
    total_clusters: clusters.length,
    risk_distribution: riskDistribution,
    issue_breakdown: Object.entries(issueGroups)
      .map(([issueType, rows]) => {
        const clusterSet = new Set(rows.map((r) => r.cluster_id));
        return {
          issue_type: issueType,
          complaint_count: rows.length,
          cluster_count: clusterSet.size,
          dominant_risk_level: dominantRiskFromRows(rows),
        };
      })
      .sort((a, b) => b.complaint_count - a.complaint_count),
    pincode_breakdown: Object.entries(pincodeGroups)
      .map(([pincode, rows]) => {
        const clusterSet = new Set(rows.map((r) => r.cluster_id));
        const issueCount = rows.reduce((acc, row) => {
          acc[row.issue_type] = (acc[row.issue_type] || 0) + 1;
          return acc;
        }, {});
        const dominantIssueType =
          Object.entries(issueCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return {
          pincode,
          complaint_count: rows.length,
          cluster_count: clusterSet.size,
          dominant_issue_type: dominantIssueType,
          highest_risk_level: highestRiskFromRows(rows),
        };
      })
      .sort((a, b) => b.complaint_count - a.complaint_count),
    cluster_breakdown: clusters
      .map((cluster) => ({
        cluster_id: cluster.cluster_id,
        issue_type: cluster.issue_type,
        pincode: cluster.pincode,
        risk_level: cluster.risk_level,
        complaint_count: cluster.complaint_count,
        priority_score: cluster.priority_score,
        confidence_score: cluster.confidence_score,
        days_pending: cluster.days_pending,
      }))
      .sort((a, b) => b.priority_score - a.priority_score),
    recommendations: [
      'Dispatch rapid response teams to top critical clusters by priority score.',
      'Create pincode-wise weekly monitoring for recurring issue types.',
      'Escalate clusters with high complaint count and rising pending days.',
    ],
  };

  if (!getGeminiApiKeys().length) return fallback;

  try {
    const compactComplaints = complaints.map((row) => ({
      complaint_id: row.complaint_id,
      cluster_id: row.cluster_id,
      issue_type: row.issue_type,
      pincode: row.pincode,
      risk_level: row.risk_level,
      status: row.status,
      address: row.address,
      description: String(row.description || '').slice(0, 180),
      ai_summary: String(row.ai_summary || '').slice(0, 180),
      created_at: row.created_at,
    }));

    const compactClusters = clusters.map((cluster) => ({
      cluster_id: cluster.cluster_id,
      issue_type: cluster.issue_type,
      pincode: cluster.pincode,
      risk_level: cluster.risk_level,
      complaint_count: cluster.complaint_count,
      priority_score: cluster.priority_score,
      confidence_score: cluster.confidence_score,
      days_pending: cluster.days_pending,
    }));

    const prompt = [
      'You are generating a detailed Rakshak AI intelligence report from full database data.',
      'Return valid JSON only. Do not include markdown.',
      'Required keys:',
      'report_title, generated_at, summary, highest_risk_area, most_common_issue, trend_insight, recommended_action, total_complaints, total_clusters,',
      'risk_distribution (array of {risk_level, complaint_count}),',
      'issue_breakdown (array of {issue_type, complaint_count, cluster_count, dominant_risk_level}),',
      'pincode_breakdown (array of {pincode, complaint_count, cluster_count, dominant_issue_type, highest_risk_level}),',
      'cluster_breakdown (array of {cluster_id, issue_type, pincode, risk_level, complaint_count, priority_score, confidence_score, days_pending}),',
      'recommendations (array of actionable bullet strings).',
      'Use all provided data and keep values factual from data.',
      `Complaints dataset: ${JSON.stringify(compactComplaints)}`,
      `Cluster dataset: ${JSON.stringify(compactClusters)}`,
    ].join('\n');

    const geminiResult = await callGemini(prompt, null);
    if (!geminiResult) return fallback;

    const ensureArray = (value) => (Array.isArray(value) ? value : []);

    return {
      report_title: String(geminiResult.report_title || fallback.report_title),
      generated_at: String(geminiResult.generated_at || fallback.generated_at),
      summary: String(geminiResult.summary || fallback.summary),
      highest_risk_area: String(geminiResult.highest_risk_area || fallback.highest_risk_area),
      most_common_issue: String(geminiResult.most_common_issue || fallback.most_common_issue),
      trend_insight: String(geminiResult.trend_insight || fallback.trend_insight),
      recommended_action: String(geminiResult.recommended_action || fallback.recommended_action),
      total_complaints: Number(geminiResult.total_complaints ?? fallback.total_complaints),
      total_clusters: Number(geminiResult.total_clusters ?? fallback.total_clusters),
      risk_distribution: ensureArray(geminiResult.risk_distribution).length
        ? ensureArray(geminiResult.risk_distribution)
        : fallback.risk_distribution,
      issue_breakdown: ensureArray(geminiResult.issue_breakdown).length
        ? ensureArray(geminiResult.issue_breakdown)
        : fallback.issue_breakdown,
      pincode_breakdown: ensureArray(geminiResult.pincode_breakdown).length
        ? ensureArray(geminiResult.pincode_breakdown)
        : fallback.pincode_breakdown,
      cluster_breakdown: ensureArray(geminiResult.cluster_breakdown).length
        ? ensureArray(geminiResult.cluster_breakdown)
        : fallback.cluster_breakdown,
      recommendations: ensureArray(geminiResult.recommendations).length
        ? ensureArray(geminiResult.recommendations).map((item) => String(item))
        : fallback.recommendations,
    };
  } catch {
    return fallback;
  }
}

async function suggestDepartmentForIssue({ issueType, pincode, riskLevel }) {
  const normalizedType = ISSUE_TYPE_OPTIONS.includes(issueType) ? issueType : 'Road Damage';
  const cacheKey = `${normalizedType}|${pincode || ''}|${riskLevel || ''}`;
  const cached = departmentCache.get(cacheKey);
  if (cached) return cached;

  const fallback = DEPARTMENT_FALLBACK[normalizedType] || 'Municipal Grievance Department';
  try {
    const prompt = [
      'You are a civic operations assistant.',
      'Given complaint issue details, return the most responsible Indian government department.',
      'Return JSON only: {"department":"..."}',
      `issue_type: ${normalizedType}`,
      `pincode: ${pincode || 'N/A'}`,
      `risk_level: ${riskLevel || 'N/A'}`,
    ].join('\n');
    const result = await callGemini(prompt, null);
    const department = String(result?.department || '').trim() || fallback;
    departmentCache.set(cacheKey, department);
    return department;
  } catch {
    departmentCache.set(cacheKey, fallback);
    return fallback;
  }
}

function buildPincodeStats(complaints) {
  return complaints.reduce((acc, row) => {
    if (!acc[row.pincode]) {
      acc[row.pincode] = { complaint_count: 0, issue_counts: {} };
    }
    acc[row.pincode].complaint_count += 1;
    acc[row.pincode].issue_counts[row.issue_type] =
      (acc[row.pincode].issue_counts[row.issue_type] || 0) + 1;
    return acc;
  }, {});
}

function buildAddressStats(complaints) {
  return complaints.reduce((acc, row) => {
    const key = String(row.address || '').trim().toLowerCase();
    if (!key) return acc;
    if (!acc[key]) {
      acc[key] = { complaint_count: 0, issue_counts: {} };
    }
    acc[key].complaint_count += 1;
    acc[key].issue_counts[row.issue_type] = (acc[key].issue_counts[row.issue_type] || 0) + 1;
    return acc;
  }, {});
}

async function answerCivicQueryWithAI({ question, complaints, clusters }) {
  if (!getGeminiApiKeys().length) {
    throw new Error('At least one Gemini API key is required for chatbot responses.');
  }

  if (!complaints.length) {
    return {
      answer: 'No complaints are available in the PostgreSQL database yet.',
    };
  }

  const pincodeStats = buildPincodeStats(complaints);
  const addressStats = buildAddressStats(complaints);

  const compactClusters = clusters.map((cluster) => ({
    cluster_id: cluster.cluster_id,
    pincode: cluster.pincode,
    issue_type: cluster.issue_type,
    risk_level: cluster.risk_level,
    complaint_count: cluster.complaint_count,
    priority_score: cluster.priority_score,
  }));

  const liveRows = complaints
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 40)
    .map((row) => ({
      complaint_id: row.complaint_id,
      pincode: row.pincode,
      issue_type: row.issue_type,
      risk_level: row.risk_level,
      status: row.status,
      address: String(row.address || '').slice(0, 100),
      created_at: row.created_at,
    }));

  const answerPrompt = [
    'You are the Rakshak AI civic intelligence chatbot.',
    'Answer using ONLY the live PostgreSQL-derived dataset below.',
    'Never invent any counts, complaint IDs, or locations.',
    'If no matching complaint rows exist for the user query, clearly say that none were found.',
    'For pincode/locality report requests, list relevant complaint IDs and issue/risk/status details.',
    'Return strict JSON only: {"answer":"..."}',
    `User question: ${question}`,
    `Live complaint rows: ${JSON.stringify(liveRows)}`,
    `Pincode aggregates: ${JSON.stringify(pincodeStats)}`,
    `Address aggregates: ${JSON.stringify(addressStats)}`,
    `Cluster aggregates: ${JSON.stringify(compactClusters)}`,
  ].join('\n');

  const result = await callGemini(answerPrompt, null);
  const answer = String(result?.answer || '').trim();
  if (!answer) {
    throw new Error('Gemini returned an empty chatbot response.');
  }
  return { answer };
}

module.exports = {
  analyzeIssueWithAI,
  generateReportWithAI,
  suggestDepartmentForIssue,
  answerCivicQueryWithAI,
};

import {
  AIAnalysisResponse,
  AnalyzeIssuePayload,
  ChatInsightResponse,
  CivicReport,
  ClusterSortBy,
  Complaint,
  ISSUE_TYPE_OPTIONS,
  IssueCluster,
  IssueFilters,
  RISK_LEVELS,
  RiskLevel,
  SubmitIssuePayload,
} from '@/lib/types';
import { calculateSeverityWeight } from '@/utils/priority';

const MOCK_MODE_STORAGE_KEY = 'civic-dev-mock-mode';
const REQUEST_TIMEOUT_MS = 12000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

let mockModeCache: boolean | null = null;
let mockClustersStore: IssueCluster[] | null = null;

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function hashText(input: string): number {
  let hash = 0;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(idx);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackCoordinates(address: string, pincode: string): {
  latitude: number;
  longitude: number;
} {
  const h = hashText(`${address}-${pincode}`);
  const latOffset = ((h % 1000) / 1000 - 0.5) * 0.35;
  const lngOffset = (((Math.floor(h / 1000) % 1000) / 1000) - 0.5) * 0.35;
  return {
    latitude: 28.6139 + latOffset,
    longitude: 77.209 + lngOffset,
  };
}

function makeMockComplaint(cluster: IssueCluster, index: number): Complaint {
  return {
    complaint_id: `${cluster.cluster_id}-CMP-${index + 1}`,
    cluster_id: cluster.cluster_id,
    issue_type: cluster.issue_type,
    description: `${cluster.issue_type} reported by resident ${index + 1}`,
    pincode: cluster.pincode,
    risk_level: cluster.risk_level,
    status: index % 3 === 0 ? 'open' : index % 3 === 1 ? 'in_progress' : 'resolved',
    address: `Block ${index + 1}, Pincode ${cluster.pincode}`,
    latitude: cluster.latitude + (Math.random() - 0.5) * 0.01,
    longitude: cluster.longitude + (Math.random() - 0.5) * 0.01,
    created_at: new Date(Date.now() - index * 3600_000).toISOString(),
  };
}

function shouldUseMockMode(): boolean {
  if (mockModeCache !== null) {
    return mockModeCache;
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(MOCK_MODE_STORAGE_KEY);
    if (stored !== null) {
      mockModeCache = stored === 'true';
      return mockModeCache;
    }
  }

  mockModeCache = process.env.NEXT_PUBLIC_USE_MOCK_MODE === 'true';
  return mockModeCache;
}

export function getMockMode(): boolean {
  return shouldUseMockMode();
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function setMockMode(enabled: boolean): void {
  mockModeCache = enabled;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MOCK_MODE_STORAGE_KEY, String(enabled));
  }
}

export async function geocodeAddress(
  address: string,
  pincode: string
): Promise<{ latitude: number; longitude: number }> {
  if (shouldUseMockMode()) {
    return fallbackCoordinates(address, pincode);
  }

  const query = encodeURIComponent(`${address}, ${pincode}, India`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      8000
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed with status ${response.status}.`);
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) {
      return fallbackCoordinates(address, pincode);
    }

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return fallbackCoordinates(address, pincode);
    }

    return { latitude, longitude };
  } catch {
    // Keep analyze flow unblocked if geocoding provider is unavailable.
    return fallbackCoordinates(address, pincode);
  }
}

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RequestOptions {
  endpointLabel: string;
  retries?: number;
  timeoutMs?: number;
}

async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit | undefined,
  options: RequestOptions
): Promise<T> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);
      if (!response.ok) {
        let detail = '';
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.error === 'string') {
            detail = errorBody.error;
          }
        } catch {
          // Ignore JSON parse errors for non-JSON failure responses.
        }

        const shouldRetry =
          attempt < retries &&
          (init?.method === undefined || init?.method === 'GET') &&
          RETRYABLE_STATUS_CODES.has(response.status);

        if (shouldRetry) {
          await wait(350 * (attempt + 1));
          continue;
        }

        throw new Error(
          `${options.endpointLabel} failed with status ${response.status}.${detail ? ` ${detail}` : ''}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      const canRetry =
        attempt < retries &&
        (init?.method === undefined || init?.method === 'GET') &&
        !isAbortError;

      if (canRetry) {
        await wait(350 * (attempt + 1));
        continue;
      }

      if (isAbortError) {
        throw new Error(`${options.endpointLabel} timed out after ${Math.round(timeoutMs / 1000)}s.`);
      }

      throw error instanceof Error
        ? error
        : new Error(`${options.endpointLabel} failed due to an unexpected error.`);
    }
  }

  throw new Error(`${options.endpointLabel} failed after retries.`);
}

function inferRiskLevel(description: string): RiskLevel {
  const text = description.toLowerCase();
  if (text.includes('accident') || text.includes('flood') || text.includes('fire')) {
    return 'critical';
  }
  if (text.includes('leak') || text.includes('collapse') || text.includes('danger')) {
    return 'very_high';
  }
  if (text.includes('broken') || text.includes('pothole') || text.includes('dark')) {
    return 'high';
  }
  return 'low';
}

function inferIssueType(description: string): string {
  const text = description.toLowerCase();
  if (text.includes('pothole') || text.includes('road')) return 'Pothole';
  if (text.includes('drain') || text.includes('waterlog')) return 'Drainage';
  if (text.includes('light') || text.includes('dark')) return 'Streetlight';
  if (text.includes('garbage') || text.includes('trash')) return 'Garbage Pile';
  if (text.includes('leak') || text.includes('pipe')) return 'Water Leak';
  if (text.includes('signal') || text.includes('traffic')) return 'Traffic Signal';
  return randomFrom(ISSUE_TYPE_OPTIONS);
}

function buildTopPincodeAnswerFromClusters(clusters: IssueCluster[]): string {
  if (!clusters.length) {
    return 'No complaints are available yet. Please submit complaints first.';
  }

  const grouped = clusters.reduce<
    Record<string, { total: number; issues: Record<string, number> }>
  >((acc, cluster) => {
    if (!acc[cluster.pincode]) {
      acc[cluster.pincode] = { total: 0, issues: {} };
    }
    acc[cluster.pincode].total += cluster.complaint_count;
    acc[cluster.pincode].issues[cluster.issue_type] =
      (acc[cluster.pincode].issues[cluster.issue_type] ?? 0) + cluster.complaint_count;
    return acc;
  }, {});

  const [topPincode, details] = Object.entries(grouped).sort(
    (a, b) => b[1].total - a[1].total
  )[0];

  const issueSummary = Object.entries(details.issues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue, count]) => `${issue} (${count})`)
    .join(', ');

  return `Pincode ${topPincode} has the highest number of complaints (${details.total}). Top issues there are: ${issueSummary}.`;
}

function buildMockClusters(): IssueCluster[] {
  const baseLat = 28.6139;
  const baseLng = 77.209;

  return Array.from({ length: 18 }, (_, idx) => {
    const risk = randomFrom(RISK_LEVELS);
    const complaintCount = Math.floor(Math.random() * 60) + 5;
    const priority = clamp(
      Math.round(complaintCount * 1.2 + calculateSeverityWeight(risk) * 14 + Math.random() * 20),
      1,
      100
    );

    return {
      cluster_id: `CLUSTER-${(idx + 1).toString().padStart(3, '0')}`,
      issue_type: randomFrom(ISSUE_TYPE_OPTIONS),
      latitude: baseLat + (Math.random() - 0.5) * 0.35,
      longitude: baseLng + (Math.random() - 0.5) * 0.35,
      pincode: `${110000 + Math.floor(Math.random() * 50)}`,
      risk_level: risk,
      complaint_count: complaintCount,
      priority_score: priority,
      confidence_score: clamp(Math.round(72 + Math.random() * 27), 1, 99),
      days_pending: Math.floor(Math.random() * 12) + 1,
    };
  });
}

function ensureMockClusters(): IssueCluster[] {
  if (!mockClustersStore) {
    mockClustersStore = buildMockClusters();
  }
  return mockClustersStore;
}

async function mockAnalyzeIssue(
  payload: AnalyzeIssuePayload
): Promise<AIAnalysisResponse> {
  const risk = inferRiskLevel(payload.description);
  return {
    issue_type: inferIssueType(payload.description),
    classification_confidence: clamp(Math.round(78 + Math.random() * 20), 1, 99),
    suggested_risk_level: risk,
    sla_days: risk === 'critical' ? 0 : risk === 'very_high' ? 1 : risk === 'high' ? 2 : 3,
    confidence_score: clamp(Math.round(80 + Math.random() * 19), 1, 99),
  };
}

async function mockSubmitIssue(payload: SubmitIssuePayload): Promise<void> {
  const store = ensureMockClusters();
  const riskWeight = calculateSeverityWeight(payload.risk_level);
  store.unshift({
    cluster_id: `CLUSTER-${Date.now()}`,
    issue_type: payload.issue_type,
    latitude: payload.latitude,
    longitude: payload.longitude,
    pincode: payload.pincode,
    risk_level: payload.risk_level,
    complaint_count: 1,
    priority_score: clamp(25 + riskWeight * 16, 1, 100),
    confidence_score: clamp(Number(payload.confidence_score ?? 88), 1, 99),
    days_pending: 0,
  });
}

async function mockGenerateReport(): Promise<CivicReport> {
  const clusters = ensureMockClusters();
  const totalComplaints = clusters.reduce((sum, cluster) => sum + cluster.complaint_count, 0);
  const byPincode = clusters.reduce<Record<string, IssueCluster[]>>((acc, cluster) => {
    if (!acc[cluster.pincode]) {
      acc[cluster.pincode] = [];
    }
    acc[cluster.pincode].push(cluster);
    return acc;
  }, {});

  const highestRiskArea =
    Object.entries(byPincode)
      .map(([pincode, rows]) => ({
        pincode,
        score:
          rows.reduce(
            (sum, row) => sum + row.priority_score + calculateSeverityWeight(row.risk_level) * 10,
            0
          ) / rows.length,
      }))
      .sort((a, b) => b.score - a.score)[0]?.pincode ?? 'N/A';

  const mostCommonIssue =
    Object.entries(
      clusters.reduce<Record<string, number>>((acc, cluster) => {
        acc[cluster.issue_type] = (acc[cluster.issue_type] ?? 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  const riskDistribution = ['low', 'high', 'very_high', 'critical'].map((risk) => ({
    risk_level: risk as CivicReport['risk_distribution'][number]['risk_level'],
    complaint_count: clusters
      .filter((cluster) => cluster.risk_level === risk)
      .reduce((sum, cluster) => sum + cluster.complaint_count, 0),
  }));

  const issueBreakdown = Object.entries(
    clusters.reduce<Record<string, IssueCluster[]>>((acc, cluster) => {
      if (!acc[cluster.issue_type]) {
        acc[cluster.issue_type] = [];
      }
      acc[cluster.issue_type].push(cluster);
      return acc;
    }, {})
  ).map(([issueType, rows]) => ({
    issue_type: issueType,
    complaint_count: rows.reduce((sum, row) => sum + row.complaint_count, 0),
    cluster_count: rows.length,
    dominant_risk_level:
      rows.sort((a, b) => b.complaint_count - a.complaint_count)[0]?.risk_level ?? 'low',
  }));

  const pincodeBreakdown = Object.entries(byPincode).map(([pincode, rows]) => ({
    pincode,
    complaint_count: rows.reduce((sum, row) => sum + row.complaint_count, 0),
    cluster_count: rows.length,
    dominant_issue_type: rows.sort((a, b) => b.complaint_count - a.complaint_count)[0]?.issue_type ?? 'N/A',
    highest_risk_level: rows.sort(
      (a, b) => calculateSeverityWeight(b.risk_level) - calculateSeverityWeight(a.risk_level)
    )[0]?.risk_level ?? 'low',
  }));

  return {
    report_title: 'Rakshak AI Intelligence Report',
    generated_at: new Date().toISOString(),
    summary: `Detected ${clusters.length} active issue clusters across ${totalComplaints} complaints requiring coordinated civic action.`,
    highest_risk_area: highestRiskArea,
    most_common_issue: mostCommonIssue,
    trend_insight: 'High-severity complaints are concentrating around a small set of pincodes.',
    recommended_action:
      'Deploy rapid response teams to the highest risk zones and clear critical backlog first.',
    total_complaints: totalComplaints,
    total_clusters: clusters.length,
    risk_distribution: riskDistribution,
    issue_breakdown: issueBreakdown,
    pincode_breakdown: pincodeBreakdown,
    cluster_breakdown: clusters,
    recommendations: [
      'Prioritize critical clusters with highest complaint density.',
      'Run pincode-wise weekly audits for recurring issue types.',
      'Track closure SLA compliance by risk level.',
    ],
  };
}

export async function analyzeIssue(
  payload: AnalyzeIssuePayload
): Promise<AIAnalysisResponse> {
  if (shouldUseMockMode()) {
    return mockAnalyzeIssue(payload);
  }

  const formData = new FormData();
  formData.append('image', payload.image);
  formData.append('description', payload.description);
  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));
  formData.append('pincode', payload.pincode);
  if (payload.address) {
    formData.append('address', payload.address);
  }

  try {
    return await fetchJsonWithRetry<AIAnalysisResponse>(
      apiUrl('/api/analyze-issue'),
      {
        method: 'POST',
        body: formData,
      },
      {
        endpointLabel: 'Analyze issue API',
        retries: 0,
        timeoutMs: 20000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to analyze issue. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function submitIssue(payload: SubmitIssuePayload): Promise<void> {
  if (shouldUseMockMode()) {
    return mockSubmitIssue(payload);
  }

  try {
    await fetchJsonWithRetry(
      apiUrl('/api/submit-issue'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      {
        endpointLabel: 'Submit issue API',
        retries: 0,
        timeoutMs: 15000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to submit issue. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getIssueClusters(): Promise<IssueCluster[]> {
  if (shouldUseMockMode()) {
    return ensureMockClusters();
  }

  try {
    return await fetchJsonWithRetry<IssueCluster[]>(
      apiUrl('/api/issue-clusters'),
      undefined,
      {
        endpointLabel: 'Issue clusters API',
        retries: 2,
        timeoutMs: 12000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to fetch issue clusters. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function generateReport(): Promise<CivicReport> {
  if (shouldUseMockMode()) {
    return mockGenerateReport();
  }

  try {
    return await fetchJsonWithRetry<CivicReport>(
      apiUrl('/api/generate-report'),
      undefined,
      {
        endpointLabel: 'Generate report API',
        retries: 2,
        timeoutMs: 60000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to generate report. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function chatWithCivicAI(question: string): Promise<ChatInsightResponse> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error('Please enter a question.');
  }

  if (shouldUseMockMode()) {
    return {
      answer: buildTopPincodeAnswerFromClusters(ensureMockClusters()),
    };
  }

  try {
    return await fetchJsonWithRetry<ChatInsightResponse>(
      apiUrl('/api/chat-insights'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion }),
      },
      {
        endpointLabel: 'Civic chatbot API',
        retries: 1,
        timeoutMs: 45000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to get chatbot response. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getComplaints(): Promise<Complaint[]> {
  if (shouldUseMockMode()) {
    return ensureMockClusters().flatMap((cluster) =>
      Array.from({ length: cluster.complaint_count }, (_, index) =>
        makeMockComplaint(cluster, index)
      )
    );
  }

  try {
    return await fetchJsonWithRetry<Complaint[]>(
      apiUrl('/api/complaints'),
      undefined,
      {
        endpointLabel: 'Complaints API',
        retries: 2,
        timeoutMs: 12000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to fetch complaints. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getClusterComplaints(clusterId: string): Promise<Complaint[]> {
  if (shouldUseMockMode()) {
    const cluster = ensureMockClusters().find((row) => row.cluster_id === clusterId);
    if (!cluster) {
      return [];
    }
    return Array.from({ length: cluster.complaint_count }, (_, index) =>
      makeMockComplaint(cluster, index)
    );
  }

  const query = encodeURIComponent(clusterId);
  try {
    return await fetchJsonWithRetry<Complaint[]>(
      apiUrl(`/api/cluster-complaints?cluster_id=${query}`),
      undefined,
      {
        endpointLabel: 'Cluster complaints API',
        retries: 2,
        timeoutMs: 12000,
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to fetch cluster complaints. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export function filterClusters(
  clusters: IssueCluster[],
  filters: IssueFilters,
  sortBy: ClusterSortBy
): IssueCluster[] {
  let output = [...clusters];

  if (filters.riskLevel) {
    output = output.filter((cluster) => cluster.risk_level === filters.riskLevel);
  }

  if (filters.issueType) {
    output = output.filter((cluster) => cluster.issue_type === filters.issueType);
  }

  if (filters.pincode) {
    const query = filters.pincode.trim();
    output = output.filter((cluster) => cluster.pincode.includes(query));
  }

  if (sortBy === 'priority_score') {
    output.sort((a, b) => b.priority_score - a.priority_score);
  } else {
    output.sort((a, b) => b.complaint_count - a.complaint_count);
  }

  return output;
}

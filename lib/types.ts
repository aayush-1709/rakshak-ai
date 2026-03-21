export type RiskLevel = 'low' | 'high' | 'very_high' | 'critical';

export const RISK_LEVELS: RiskLevel[] = ['low', 'high', 'very_high', 'critical'];

export const ISSUE_TYPE_OPTIONS: string[] = [
  'Pothole',
  'Drainage',
  'Streetlight',
  'Garbage Pile',
  'Water Leak',
  'Traffic Signal',
  'Road Damage',
  'Encroachment',
];

export interface IssueCluster {
  cluster_id: string;
  issue_type: string;
  latitude: number;
  longitude: number;
  pincode: string;
  risk_level: RiskLevel;
  responsible_department?: string;
  complaint_count: number;
  priority_score: number;
  confidence_score: number;
  days_pending: number;
}

export interface AIAnalysisResponse {
  issue_type: string;
  classification_confidence: number;
  suggested_risk_level: RiskLevel;
  sla_days: number;
  confidence_score: number;
  ai_summary?: string;
  override_issue_type?: string;
}

export interface CivicReport {
  report_title: string;
  generated_at: string;
  summary: string;
  highest_risk_area: string;
  most_common_issue: string;
  trend_insight: string;
  recommended_action: string;
  total_complaints: number;
  total_clusters: number;
  risk_distribution: Array<{
    risk_level: RiskLevel;
    complaint_count: number;
  }>;
  issue_breakdown: Array<{
    issue_type: string;
    complaint_count: number;
    cluster_count: number;
    dominant_risk_level: RiskLevel;
  }>;
  pincode_breakdown: Array<{
    pincode: string;
    complaint_count: number;
    cluster_count: number;
    dominant_issue_type: string;
    highest_risk_level: RiskLevel;
  }>;
  cluster_breakdown: Array<{
    cluster_id: string;
    issue_type: string;
    pincode: string;
    risk_level: RiskLevel;
    complaint_count: number;
    priority_score: number;
    confidence_score: number;
    days_pending: number;
  }>;
  recommendations: string[];
}

export interface Complaint {
  complaint_id: string;
  cluster_id: string;
  issue_type: string;
  description: string;
  pincode: string;
  risk_level: RiskLevel;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
  confidence_score: number;
  created_at: string;
  image_data_url?: string;
  video_data_url?: string;
  ai_summary?: string;
}

export interface AnalyzeIssuePayload {
  image: File;
  description: string;
  latitude: number;
  longitude: number;
  pincode: string;
  address?: string;
}

export interface ChatInsightResponse {
  answer: string;
}

export interface SubmitIssuePayload {
  issue_type: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  pincode: string;
  risk_level: RiskLevel;
  confidence_score?: number;
  image_data_url?: string;
  video_data_url?: string;
  ai_summary?: string;
}

export interface IssueFilters {
  riskLevel?: RiskLevel;
  issueType?: string;
  pincode?: string;
  /** Substring match on cluster_id (case-insensitive). */
  clusterId?: string;
}

export type ClusterSortBy = 'priority_score' | 'complaint_count';

export interface ReportDraft {
  /** Primary image used for AI analyze and submission payload. */
  image: File;
  /** Extra images shown in preview; only the primary is sent to the current API. */
  additionalImages?: File[];
  video?: File;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  pincode: string;
}

/** Payload for POST /api/corruption-reports */
export interface CorruptionReportPayload {
  description: string;
  reporter_name: string;
  phone: string;
  department: string;
  accused_person: string;
  /** Optional base64 data URL for uploaded proof */
  proof_data_url?: string;
}

export interface CorruptionReportRecord {
  id: string;
  description: string;
  reporter_name: string;
  phone: string;
  department: string;
  accused_person: string;
  proof_data_url?: string;
  created_at: string;
}

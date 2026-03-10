const crypto = require('node:crypto');

const RISK_WEIGHT = {
  low: 1,
  high: 2,
  very_high: 3,
  critical: 4,
};

const RISK_ORDER = ['low', 'high', 'very_high', 'critical'];

function riskWeight(level) {
  return RISK_WEIGHT[level] ?? 1;
}

function highestRisk(a, b) {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

function clusterIdFor(issueType, pincode) {
  const digest = crypto
    .createHash('sha1')
    .update(`${issueType.toLowerCase()}-${pincode}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  return `CLUSTER-${digest}`;
}

function daysBetween(isoDate) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

function computePriorityScore(cluster) {
  const severity = riskWeight(cluster.risk_level);
  const score = severity * 20 + cluster.complaint_count * 1.2 + cluster.days_pending * 2;
  return Math.min(100, Math.max(1, Math.round(score)));
}

function aggregateClusters(complaints) {
  const grouped = new Map();

  for (const complaint of complaints) {
    const clusterId = complaint.cluster_id || clusterIdFor(complaint.issue_type, complaint.pincode);
    const existing = grouped.get(clusterId);
    if (!existing) {
      grouped.set(clusterId, {
        cluster_id: clusterId,
        issue_type: complaint.issue_type,
        latitude_total: complaint.latitude,
        longitude_total: complaint.longitude,
        pincode: complaint.pincode,
        risk_level: complaint.risk_level,
        complaint_count: 1,
        confidence_total: complaint.confidence_score ?? 70,
        days_pending: daysBetween(complaint.created_at),
      });
      continue;
    }

    existing.latitude_total += complaint.latitude;
    existing.longitude_total += complaint.longitude;
    existing.complaint_count += 1;
    existing.confidence_total += complaint.confidence_score ?? 70;
    existing.days_pending = Math.max(existing.days_pending, daysBetween(complaint.created_at));
    existing.risk_level = highestRisk(existing.risk_level, complaint.risk_level);
  }

  return Array.from(grouped.values())
    .map((item) => {
      const cluster = {
        cluster_id: item.cluster_id,
        issue_type: item.issue_type,
        latitude: Number((item.latitude_total / item.complaint_count).toFixed(6)),
        longitude: Number((item.longitude_total / item.complaint_count).toFixed(6)),
        pincode: item.pincode,
        risk_level: item.risk_level,
        complaint_count: item.complaint_count,
        priority_score: 0,
        confidence_score: Number((item.confidence_total / item.complaint_count).toFixed(1)),
        days_pending: item.days_pending,
      };
      cluster.priority_score = computePriorityScore(cluster);
      return cluster;
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

module.exports = {
  aggregateClusters,
  clusterIdFor,
  riskWeight,
};

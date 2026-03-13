'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { getApiBaseUrl } from '@/lib/api';
import { useLanguage } from './language-provider';

type EndpointStatus = 'ok' | 'down' | 'checking';

interface EndpointCheckResult {
  id: string;
  labelKey: string;
  endpoint: string;
  displayEndpoint: string;
  method: 'GET' | 'POST';
  status: EndpointStatus;
  httpStatus?: number;
  latencyMs?: number;
  note?: string;
}

const CHECKS: Array<{
  id: string;
  labelKey: string;
  endpoint: string;
  displayEndpoint?: string;
  method: 'GET' | 'POST';
}> = [
  {
    id: 'analyze',
    labelKey: 'validator.analyzeIssue',
    endpoint: '/api/analyze-issue',
    method: 'POST',
  },
  {
    id: 'submit',
    labelKey: 'validator.submitIssue',
    endpoint: '/api/submit-issue',
    method: 'POST',
  },
  { id: 'clusters', labelKey: 'validator.issueClusters', endpoint: '/api/issue-clusters', method: 'GET' },
  { id: 'report', labelKey: 'validator.generateReport', endpoint: '/api/generate-report', method: 'GET' },
  { id: 'complaints', labelKey: 'validator.complaints', endpoint: '/api/complaints', method: 'GET' },
  {
    id: 'cluster-complaints',
    labelKey: 'validator.clusterComplaints',
    endpoint: '/api/cluster-complaints?cluster_id=validator',
    displayEndpoint: '/api/cluster-complaints',
    method: 'GET',
  },
];

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) {
    return path;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildRequestInit(checkId: string, method: 'GET' | 'POST'): RequestInit {
  if (checkId === 'analyze') {
    const formData = new FormData();
    formData.append('description', 'Validator ping for analyze endpoint');
    formData.append('latitude', '28.6139');
    formData.append('longitude', '77.2090');
    formData.append('pincode', '110001');
    return { method, body: formData };
  }

  if (checkId === 'submit') {
    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Validator-Check': 'true',
      },
      body: JSON.stringify({
        issue_type: 'Pothole',
        description: 'Validator ping for submit endpoint',
        address: 'Validator test area',
        latitude: 28.6139,
        longitude: 77.209,
        pincode: '110001',
        risk_level: 'high',
      }),
    };
  }

  return { method };
}

function statusBadge(status: EndpointStatus, t: (key: string) => string) {
  if (status === 'ok') return <Badge className="bg-green-100 text-green-900">{t('status.ok')}</Badge>;
  if (status === 'down') return <Badge className="bg-red-100 text-red-900">{t('status.down')}</Badge>;
  return <Badge className="bg-slate-200 text-slate-800">{t('status.checking')}</Badge>;
}

export default function ApiValidatorPanel() {
  const { t } = useLanguage();
  const [results, setResults] = useState<EndpointCheckResult[]>(
    CHECKS.map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      endpoint: item.endpoint,
      displayEndpoint: item.displayEndpoint ?? item.endpoint,
      method: item.method,
      status: 'checking',
    }))
  );
  const [isChecking, setIsChecking] = useState(false);

  const baseUrlLabel = useMemo(() => getApiBaseUrl() || 'same-origin (frontend host)', []);

  const checkEndpoints = useCallback(async () => {
    setIsChecking(true);
    setResults((prev) => prev.map((item) => ({ ...item, status: 'checking', note: undefined })));

    const updates = await Promise.all(
      CHECKS.map(async (item): Promise<EndpointCheckResult> => {
        const start = performance.now();
        try {
          const init = buildRequestInit(item.id, item.method);
          const response = await fetch(buildUrl(item.endpoint), {
            ...init,
          });
          const latencyMs = Math.round(performance.now() - start);

          const ok = response.status !== 404 && response.status < 500;
          return {
            id: item.id,
            labelKey: item.labelKey,
            endpoint: item.endpoint,
            displayEndpoint: item.displayEndpoint ?? item.endpoint,
            method: item.method,
            status: ok ? 'ok' : 'down',
            httpStatus: response.status,
            latencyMs,
            note: ok ? undefined : t('validator.endpointUnreachable'),
          };
        } catch (error) {
          return {
            id: item.id,
            labelKey: item.labelKey,
            endpoint: item.endpoint,
            displayEndpoint: item.displayEndpoint ?? item.endpoint,
            method: item.method,
            status: 'down',
            note: error instanceof Error ? error.message : t('validator.networkError'),
          };
        }
      })
    );

    setResults(updates);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkEndpoints();
  }, [checkEndpoints]);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{t('validator.title')}</CardTitle>
          <Button size="sm" variant="outline" onClick={checkEndpoints} disabled={isChecking}>
            {isChecking ? (
              <span className="flex items-center gap-1">
                <Spinner className="w-3 h-3" />
                {t('status.checking')}
              </span>
            ) : (
              t('action.recheck')
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-500">{t('validator.baseUrl')}: {baseUrlLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {results.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-md p-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.method} {item.displayEndpoint}
                </p>
                <p className="text-xs text-slate-500">{t(item.labelKey)}</p>
                {item.note && <p className="text-xs text-red-600 mt-1">{item.note}</p>}
              </div>
              <div className="text-right">
                <div>{statusBadge(item.status, t)}</div>
                {(item.httpStatus || item.latencyMs) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {item.httpStatus ? `HTTP ${item.httpStatus}` : ''}{' '}
                    {item.latencyMs ? `• ${item.latencyMs}ms` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

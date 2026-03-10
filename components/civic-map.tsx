'use client';

import dynamic from 'next/dynamic';
import { IssueCluster } from '@/lib/types';

interface CivicMapProps {
  clusters: IssueCluster[];
  isLoading?: boolean;
  onMarkerClick: (cluster: IssueCluster) => void;
}

const CivicMapLeaflet = dynamic(() => import('./civic-map-leaflet'), {
  ssr: false,
});

export default function CivicMap({ clusters, isLoading = false, onMarkerClick }: CivicMapProps) {
  return <CivicMapLeaflet clusters={clusters} isLoading={isLoading} onMarkerClick={onMarkerClick} />;
}

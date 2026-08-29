export interface SpillEntity {
  id: string;
  name: string;
  detectedAt: Date;
  status: 'ACTIVE' | 'RESOLVED' | 'VERIFYING';
  areaSqKm: number;
  currentLocation: {
    lat: number;
    lng: number;
  };
  hindcastOrigin: {
    lat: number;
    lng: number;
    estimatedTime: Date;
  };
  confidence: number;
}

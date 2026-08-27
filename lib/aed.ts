export type AedRecord = {
  id: string;
  municipalityCode: string;
  municipalityNameJa: string;
  nameJa: string;
  nameKana?: string | null;
  addressJa: string;
  latitude: number;
  longitude: number;
  placementJa?: string | null;
  availableDaysRaw?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  availabilityNotesJa?: string | null;
  explicit24Hours: boolean;
  source: {
    sourceId: string;
    datasetTitle: string;
    datasetUrl: string;
    resourceUrl: string;
    publisher: string;
    license: string;
    sourceUpdatedAt?: string | null;
    fetchedAt: string;
  };
};

export type RankedAed = AedRecord & { distanceMeters: number; bearing: number };

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radiansValue: number) => (radiansValue * 180) / Math.PI;

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6_371_000;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number) {
  const startLat = radians(lat1);
  const endLat = radians(lat2);
  const deltaLon = radians(lon2 - lon1);
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function rankAeds(records: AedRecord[], latitude: number, longitude: number): RankedAed[] {
  return records
    .map((record) => ({ ...record, distanceMeters: distanceMeters(latitude, longitude, record.latitude, record.longitude), bearing: bearingDegrees(latitude, longitude, record.latitude, record.longitude) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 20)
    .sort((a, b) => {
      const availabilityA = a.explicit24Hours ? 0 : 1;
      const availabilityB = b.explicit24Hours ? 0 : 1;
      return availabilityA - availabilityB || a.distanceMeters - b.distanceMeters;
    })
    .slice(0, 3);
}

export function cardinalDirection(bearing: number) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(bearing / 45) % 8];
}

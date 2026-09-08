/**
 * Trajectory Processing Utility for OilTraceAI / Kairos
 *
 * Implements robust AIS trajectory cleaning, chronological ordering,
 * deduplication, and kinematic strand decomposition to eliminate multi-run
 * zigzag/sawtooth rendering artifacts.
 */

export interface CleanedVesselTrack {
  vesselId: string;
  vesselName: string;
  mmsi: string;
  imo?: string;
  vesselType?: string;
  score: number;
  rank: number;
  rawPositionsCount: number;
  cleanedPositions: any[];
  latLngs: [number, number][]; // Leaflet format: [lat, lon]
  latestPos: any | null;
  latestLatLng: [number, number] | null;
  heading: number;
  speed: number;
  distToRefKm: number;
}

/**
 * Calculates great-circle distance between two points on the Earth in kilometers.
 */
export function haversineDistKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extracts Leaflet-compatible [latitude, longitude] from diverse AIS position objects.
 * Handles GeoJSON Point (coordinates = [lon, lat]) and direct lat/lon properties.
 */
export function extractPosLatLng(p: any): [number, number] | null {
  if (!p) return null;

  // GeoJSON Point: location.coordinates is [lon, lat]
  if (
    p.location?.coordinates &&
    Array.isArray(p.location.coordinates) &&
    p.location.coordinates.length >= 2
  ) {
    const lon = Number(p.location.coordinates[0]);
    const lat = Number(p.location.coordinates[1]);
    if (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    ) {
      return [lat, lon];
    }
  }

  // Direct lat / lon or latitude / longitude properties
  const lat = Number(p.lat ?? p.latitude);
  const lon = Number(p.lon ?? p.longitude ?? p.lng);
  if (
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  ) {
    return [lat, lon];
  }

  return null;
}

/**
 * Cleans and decomposes raw vessel positions into a single, kinematically plausible trajectory strand.
 * Eliminates interleaved track runs, time-reversal anomalies, and ocean-spanning jumps.
 *
 * @param cand The candidate vessel object or vessel entity
 * @param referenceCenter Optional reference [lat, lon] (e.g. source origin or oil slick centroid)
 * @param rank Optional candidate rank
 * @returns CleanedVesselTrack with single continuous [lat, lon][] polyline coordinates
 */
export function processVesselTrajectory(
  cand: any,
  referenceCenter?: [number, number] | null,
  rank: number = 1
): CleanedVesselTrack {
  const vessel = cand?.vessel || cand || {};
  const vesselId = String(
    vessel?.vessel_id || cand?.vessel_id || cand?.mmsi || 'unknown-vessel'
  );
  const vesselName = vessel?.name || cand?.name || 'Unknown Vessel';
  const mmsi = String(vessel?.mmsi || cand?.mmsi || 'N/A');
  const imo = vessel?.imo || cand?.imo;
  const vesselType = vessel?.vessel_type || cand?.vessel_type || 'Vessel';
  const score = Number(cand?.attribution_score ?? cand?.score ?? 0);
  const rawPositions: any[] = vessel?.positions || cand?.positions || [];

  const defaultResult: CleanedVesselTrack = {
    vesselId,
    vesselName,
    mmsi,
    imo,
    vesselType,
    score,
    rank: cand?.rank ?? rank,
    rawPositionsCount: rawPositions.length,
    cleanedPositions: [],
    latLngs: [],
    latestPos: null,
    latestLatLng: null,
    heading: 0,
    speed: 0,
    distToRefKm: 0
  };

  if (!rawPositions || rawPositions.length === 0) {
    return defaultResult;
  }

  // 1. Filter valid coordinates and parseable timestamps
  const validPoints: any[] = [];
  for (const p of rawPositions) {
    const coords = extractPosLatLng(p);
    if (!coords) continue;
    const time = p.timestamp ? new Date(p.timestamp).getTime() : NaN;
    if (isNaN(time)) continue;
    validPoints.push(p);
  }

  if (validPoints.length === 0) {
    return defaultResult;
  }

  // 2. Sort chronologically ascending
  validPoints.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 3. Deduplicate exact duplicate timestamp + coordinate points
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const p of validPoints) {
    const [lat, lon] = extractPosLatLng(p)!;
    const key = `${p.timestamp}_${lat.toFixed(5)}_${lon.toFixed(5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }

  if (deduped.length === 0) {
    return defaultResult;
  }

  // 4. Decompose into kinematic strands (speed <= 45 kn)
  const strands: any[][] = [];
  for (const p of deduped) {
    const [lat, lon] = extractPosLatLng(p)!;
    const pTime = new Date(p.timestamp).getTime();

    let bestStrand: any[] | null = null;
    let minSpeed = Infinity;

    for (const strand of strands) {
      const lastP = strand[strand.length - 1];
      const [lastLat, lastLon] = extractPosLatLng(lastP)!;
      const lastTime = new Date(lastP.timestamp).getTime();
      const dtHours = Math.abs(pTime - lastTime) / (1000 * 3600);

      if (dtHours === 0) {
        const distKm = haversineDistKm(lastLat, lastLon, lat, lon);
        if (distKm < 0.1) {
          bestStrand = strand;
          break;
        }
      } else {
        const distKm = haversineDistKm(lastLat, lastLon, lat, lon);
        const speedKn = (distKm / 1.852) / dtHours;
        if (speedKn <= 45.0 && speedKn < minSpeed) {
          minSpeed = speedKn;
          bestStrand = strand;
        }
      }
    }

    if (bestStrand) {
      bestStrand.push(p);
    } else {
      strands.push([p]);
    }
  }

  // Filter out single-point glitches if multi-point strands exist
  const candidateStrands = strands.filter(s => s.length >= 2);
  const usableStrands = candidateStrands.length > 0 ? candidateStrands : strands;

  // 5. Select primary strand (closest to reference origin/slick or longest)
  let bestStrand = usableStrands[0];
  let bestMinDist = referenceCenter
    ? Math.min(
        ...bestStrand.map(p => {
          const [la, lo] = extractPosLatLng(p)!;
          return haversineDistKm(la, lo, referenceCenter[0], referenceCenter[1]);
        })
      )
    : 0;

  if (referenceCenter) {
    for (let i = 1; i < usableStrands.length; i++) {
      const strand = usableStrands[i];
      const strandMinDist = Math.min(
        ...strand.map(p => {
          const [la, lo] = extractPosLatLng(p)!;
          return haversineDistKm(la, lo, referenceCenter[0], referenceCenter[1]);
        })
      );
      if (strandMinDist < bestMinDist - 10) {
        bestStrand = strand;
        bestMinDist = strandMinDist;
      } else if (
        Math.abs(strandMinDist - bestMinDist) <= 10 &&
        strand.length > bestStrand.length
      ) {
        bestStrand = strand;
        bestMinDist = strandMinDist;
      }
    }
  } else {
    for (let i = 1; i < usableStrands.length; i++) {
      if (usableStrands[i].length > bestStrand.length) {
        bestStrand = usableStrands[i];
      }
    }
  }

  // 6. Build the final clean trajectory Leaflet coordinates [lat, lon][]
  const latLngs: [number, number][] = bestStrand.map(p => extractPosLatLng(p)!);
  const latestPos = bestStrand[bestStrand.length - 1];
  const latestLatLng = extractPosLatLng(latestPos)!;
  const heading = Number(latestPos.heading ?? latestPos.course ?? 0);
  const speed = Number(latestPos.speed ?? 0);

  const distToRefKm = referenceCenter
    ? haversineDistKm(latestLatLng[0], latestLatLng[1], referenceCenter[0], referenceCenter[1])
    : 0;

  // Console debug info per requirement
  console.log("[VESSEL TRACK]", {
    vesselId,
    positionCount: rawPositions.length,
    coordinateCount: latLngs.length,
    trackId: `track-${vesselId}`
  });

  return {
    vesselId,
    vesselName,
    mmsi,
    imo,
    vesselType,
    score,
    rank: cand?.rank ?? rank,
    rawPositionsCount: rawPositions.length,
    cleanedPositions: bestStrand,
    latLngs,
    latestPos,
    latestLatLng,
    heading,
    speed,
    distToRefKm
  };
}

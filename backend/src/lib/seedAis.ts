import { AisRecord } from '../models/AisRecord';

export async function seedDeterministicAis() {
  const count = await AisRecord.countDocuments();
  if (count > 0) {
    console.log(`AIS data already seeded (${count} records). Skipping seed.`);
    return;
  }

  console.log('Seeding deterministic AIS scenario...');
  
  const baseTime = new Date('2026-08-29T11:18:00Z').getTime();
  const records = [];

  // 1. Strong Candidate (Oceanic Pride)
  // Passes directly through 19.05, 72.85 at T-60 mins (10:18Z)
  for (let i = -120; i <= 30; i += 5) { // every 5 mins
    const t = new Date(baseTime + i * 60000);
    // Moving eastwards
    const lon = 72.75 + (i + 120) * 0.001;
    const lat = 19.05 + Math.sin(i / 20) * 0.01;
    records.push({
      vessel_id: 'V-1001',
      name: 'Oceanic Pride',
      mmsi: '123456789',
      imo: 'IMO9123456',
      vessel_type: 'Oil Tanker',
      timestamp: t,
      location: { type: 'Point', coordinates: [lon, lat] },
      speed: 12.5,
      heading: 90
    });
  }

  // 2. Weak temporal candidate (Sea Voyager)
  // Passes through exact spot but at T-10 mins (too late for backward drift)
  for (let i = -120; i <= 30; i += 5) {
    const t = new Date(baseTime + i * 60000);
    const lon = 72.85 + (i + 10) * 0.002;
    const lat = 19.05 - (i + 10) * 0.001;
    records.push({
      vessel_id: 'V-1002',
      name: 'Sea Voyager',
      mmsi: '987654321',
      imo: 'IMO8987654',
      vessel_type: 'Cargo',
      timestamp: t,
      location: { type: 'Point', coordinates: [lon, lat] },
      speed: 14.2,
      heading: 135
    });
  }

  // 3. Weak spatial candidate (Global Trader)
  // Wrong path, wrong location
  for (let i = -120; i <= 30; i += 5) {
    const t = new Date(baseTime + i * 60000);
    const lon = 72.65 - (i + 120) * 0.001;
    const lat = 19.20 + (i + 120) * 0.001;
    records.push({
      vessel_id: 'V-1003',
      name: 'Global Trader',
      mmsi: '567891234',
      imo: 'IMO7567891',
      vessel_type: 'Bulk Carrier',
      timestamp: t,
      location: { type: 'Point', coordinates: [lon, lat] },
      speed: 10.1,
      heading: 315
    });
  }

  // Generate 20 random background vessels
  for (let v = 0; v < 20; v++) {
    const startLon = 72.5 + Math.random() * 0.6;
    const startLat = 18.8 + Math.random() * 0.6;
    const dLon = (Math.random() - 0.5) * 0.005;
    const dLat = (Math.random() - 0.5) * 0.005;
    const mmsi = Math.floor(100000000 + Math.random() * 900000000).toString();
    
    for (let i = -120; i <= 30; i += 5) {
      const t = new Date(baseTime + i * 60000);
      records.push({
        vessel_id: `V-RAND-${v}`,
        name: `Vessel ${v}`,
        mmsi,
        vessel_type: 'Cargo',
        timestamp: t,
        location: { type: 'Point', coordinates: [startLon + dLon * (i + 120), startLat + dLat * (i + 120)] },
        speed: 10 + Math.random() * 5,
        heading: Math.random() * 360
      });
    }
  }

  await AisRecord.insertMany(records);
  console.log(`Seeded ${records.length} AIS records for demo scenario.`);
}

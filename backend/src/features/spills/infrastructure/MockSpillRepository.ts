import { SpillEntity } from '../domain/SpillEntity';
import { ISpillRepository } from '../domain/ISpillRepository';

export class MockSpillRepository implements ISpillRepository {
  private spills: SpillEntity[] = [
    {
      id: 'spill-001',
      name: 'Mumbai Coast Incident',
      detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'ACTIVE',
      areaSqKm: 42,
      currentLocation: { lat: 18.85, lng: 72.75 },
      hindcastOrigin: { lat: 18.80, lng: 72.70, estimatedTime: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      confidence: 94
    },
    {
      id: 'spill-002',
      name: 'Kochi Offshore Slick',
      detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), 
      status: 'VERIFYING',
      areaSqKm: 12,
      currentLocation: { lat: 9.90, lng: 75.80 },
      hindcastOrigin: { lat: 9.85, lng: 75.75, estimatedTime: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      confidence: 76
    }
  ];

  async getAllActiveSpills(): Promise<SpillEntity[]> {
    return this.spills.filter(s => s.status === 'ACTIVE' || s.status === 'VERIFYING');
  }

  async getSpillById(id: string): Promise<SpillEntity | null> {
    return this.spills.find(s => s.id === id) || null;
  }

  async createSpill(spill: Omit<SpillEntity, 'id'>): Promise<SpillEntity> {
    const newSpill = { ...spill, id: `spill-${Date.now()}` };
    this.spills.push(newSpill);
    return newSpill;
  }
}

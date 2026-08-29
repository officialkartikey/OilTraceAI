import { SpillEntity } from './SpillEntity';

export interface ISpillRepository {
  getAllActiveSpills(): Promise<SpillEntity[]>;
  getSpillById(id: string): Promise<SpillEntity | null>;
  createSpill(spill: Omit<SpillEntity, 'id'>): Promise<SpillEntity>;
}

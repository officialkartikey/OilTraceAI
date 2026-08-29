import { SpillEntity } from '../domain/SpillEntity';
import { ISpillRepository } from '../domain/ISpillRepository';

export class GetActiveSpillsUseCase {
  constructor(private readonly spillRepository: ISpillRepository) {}

  async execute(): Promise<SpillEntity[]> {
    const spills = await this.spillRepository.getAllActiveSpills();
    
    // Sort by confidence or recently detected
    return spills.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }
}

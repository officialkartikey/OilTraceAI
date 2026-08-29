import express from 'express';
import { GetActiveSpillsUseCase } from '../features/spills/application/GetActiveSpillsUseCase';
import { MockSpillRepository } from '../features/spills/infrastructure/MockSpillRepository';

const router = express.Router();

const spillRepository = new MockSpillRepository();
const getActiveSpillsUseCase = new GetActiveSpillsUseCase(spillRepository);

router.get('/', async (req, res) => {
  try {
    const spills = await getActiveSpillsUseCase.execute();
    return res.json({ success: true, data: spills });
  } catch (error) {
    console.error('Failed to fetch spills:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;

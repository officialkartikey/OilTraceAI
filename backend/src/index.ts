import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectToDatabase from './lib/mongodb';
import authRoutes from './routes/auth';
import spillsRoutes from './routes/spills';
import analysisRoutes from './routes/analysis';
import { seedDeterministicAis } from './lib/seedAis';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spills', spillsRoutes);
app.use('/api', analysisRoutes);

// Database Connection and Server Start
const startServer = async () => {
  try {
    await connectToDatabase();
    console.log('Connected to Database');
    
    // Seed Demo Data
    await seedDeterministicAis();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { PrismaClient } from '@prisma/client';
import { AppDataSource } from './config/database';
import { logger } from './utils/logger';

const app = express();
const prisma = new PrismaClient();

// Initialize TypeORM connection
AppDataSource.initialize()
  .then(() => {
    logger.info('TypeORM Data Source has been initialized!');
  })
  .catch((error) => {
    logger.error('Error during TypeORM Data Source initialization:', error);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    prisma.$disconnect(),
    AppDataSource.destroy()
  ]);
  process.exit(0);
}); 
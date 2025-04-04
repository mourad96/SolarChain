import 'dotenv/config'; // Load environment variables first
import express from 'express';
import cors from 'cors';
import router from './routes';
import { prisma } from './services/prisma.service'; 
import { logger } from './utils/logger';

// Validate required environment variables
const requiredEnvVars = [
  'AMOY_URL',
  'PRIVATE_KEY',
  'SOLAR_PANEL_REGISTRY_ADDRESS',
  'SOLAR_PANEL_FACTORY_ADDRESS'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.warn(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    missingEnvVars: missingEnvVars.length > 0 ? missingEnvVars : undefined
  });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
}); 
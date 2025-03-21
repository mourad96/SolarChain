import { PrismaClient } from '@prisma/client';

// Create a singleton instance of the PrismaClient
class PrismaService {
  private static instance: PrismaService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    // Log available models
    console.log('Available Prisma models:', Object.keys(this.prisma));
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export a singleton instance
export const prisma = PrismaService.getInstance().getClient(); 
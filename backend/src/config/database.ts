import { DataSource } from 'typeorm';
import { config } from './index';
import { User } from '../entities/User';
import { SolarPanel } from '../entities/SolarPanel';
import { IoTData } from '../entities/IoTData';
import { ShareToken } from '../entities/ShareToken';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: config.database.logging,
  entities: [User, SolarPanel, IoTData, ShareToken],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
}); 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { SolarPanel } from './SolarPanel';

@Entity('iot_data')
export class IoTData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SolarPanel, panel => panel.iotData)
  panel!: SolarPanel;

  @Column('decimal', { precision: 10, scale: 2 })
  powerOutput!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  temperature!: number;

  @Column('decimal', { precision: 7, scale: 2 })
  voltage!: number;

  @Column('decimal', { precision: 7, scale: 2 })
  current!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  kwhProduced!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  revenue?: number;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  timestamp!: Date;
} 
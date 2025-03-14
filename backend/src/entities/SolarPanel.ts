import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { IoTData } from './IoTData';
import { ShareToken } from './ShareToken';

@Entity('solar_panels')
export class SolarPanel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  location!: string;

  @Column('decimal')
  capacity!: number;

  @Column()
  onChainPanelId!: number;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => User, user => user.panels)
  owner!: User;

  @OneToMany(() => IoTData, iotData => iotData.panel)
  iotData!: IoTData[];

  @OneToMany(() => ShareToken, shareToken => shareToken.panel)
  shares!: ShareToken[];

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 
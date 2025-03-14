import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SolarPanel } from './SolarPanel';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  walletAddress?: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'panel_owner', 'investor', 'guest'],
    default: 'guest'
  })
  role!: 'admin' | 'panel_owner' | 'investor' | 'guest';

  @Column({ default: false })
  isEmailVerified!: boolean;

  @OneToMany(() => SolarPanel, panel => panel.owner)
  panels!: SolarPanel[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 
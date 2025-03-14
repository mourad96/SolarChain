import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { User } from './User';
import { SolarPanel } from './SolarPanel';

@Entity('share_tokens')
export class ShareToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SolarPanel, panel => panel.shares)
  panel!: SolarPanel;

  @Column()
  totalShares!: number;

  @Column()
  onChainTokenId!: number;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'user_tokens',
    joinColumn: {
      name: 'token_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id'
    }
  })
  holders!: User[];

  @Column('jsonb')
  holderBalances!: Record<string, number>;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 
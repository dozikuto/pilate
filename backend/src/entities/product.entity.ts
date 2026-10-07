import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum ProductCategory {
  APPAREL = 'apparel',       
  EQUIPMENT = 'equipment',   
  BEVERAGE = 'beverage',     
  ACCESSORY = 'accessory',   
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  sku: string;

  @Column({
    type: 'enum',
    enum: ProductCategory,
    default: ProductCategory.EQUIPMENT,
  })
  category: ProductCategory;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  price: number;

  @Column({ name: 'stock_quantity', default: 0 })
  stockQuantity: number;

  @Column({ default: 'cái' })
  unit: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

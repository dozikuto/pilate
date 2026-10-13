import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Member } from "./member.entity";
import { User } from "./user.entity";
import { Branch } from "./branch.entity";
import { PaymentMethod } from "../common/enums/payment-method.enum";
import { PaymentStatus } from "../common/enums/payment-status.enum";

@Entity("transactions")
export class Transaction {
  @Column({ name: "package_id", nullable: true })
  packageId: string;
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "member_id" })
  memberId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: "discount_amount",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ name: "final_amount", type: "decimal", precision: 10, scale: 2 })
  finalAmount: number;

  @Column({ name: "payment_method", type: "enum", enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({
    name: "payment_status",
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: "reference_code", nullable: true })
  referenceCode: string;

  @Column({ name: "voucher_code", nullable: true })
  voucherCode: string;

  @Column({ name: "invoice_url", nullable: true })
  invoiceUrl: string;

  @Column({ name: "processed_by", nullable: true })
  processedBy: string;

  @Column({ name: "branch_id" })
  branchId: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @ManyToOne(() => Member)
  @JoinColumn({ name: "member_id" })
  member: Member;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "processed_by" })
  processor: User;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePaymentProofDto {
  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsUUID()
  tagihanId?: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

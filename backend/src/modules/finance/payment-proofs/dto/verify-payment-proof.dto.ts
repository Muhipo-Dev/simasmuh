import { IsString, IsOptional, IsIn } from 'class-validator';

export class VerifyPaymentProofDto {
  @IsString()
  @IsIn(['DIVERIFIKASI', 'DITOLAK'])
  status: 'DIVERIFIKASI' | 'DITOLAK';

  @IsOptional()
  @IsString()
  notes?: string;
}

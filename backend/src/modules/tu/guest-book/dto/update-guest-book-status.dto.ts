import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class UpdateGuestBookStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['TIBA', 'PROSES', 'SELESAI'])
  status: string;

  @IsString()
  @IsOptional()
  catatan?: string;
}

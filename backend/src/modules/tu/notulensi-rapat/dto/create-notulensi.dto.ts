import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateNotulensiDto {
  @IsString()
  @IsNotEmpty()
  judulRapat: string;

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  kategori?: string;

  @IsString()
  @IsOptional()
  tanggal?: string;

  @IsString()
  @IsOptional()
  waktuMulai?: string;

  @IsString()
  @IsOptional()
  waktuSelesai?: string;

  @IsString()
  @IsOptional()
  tempat?: string;

  @IsString()
  @IsNotEmpty()
  pemimpinRapat: string;

  @IsString()
  @IsNotEmpty()
  notulis: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  pesertaHadirCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  pesertaTotalCount?: number;

  @IsString()
  @IsOptional()
  daftarPeserta?: string;

  @IsString()
  @IsOptional()
  poinPembahasan?: string;

  @IsString()
  @IsNotEmpty()
  keputusanHasil: string;

  @IsString()
  @IsOptional()
  tindakLanjut?: string;

  @IsString()
  @IsOptional()
  fotoDokumentasi?: string;

  @IsString()
  @IsOptional()
  fileLampiran?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

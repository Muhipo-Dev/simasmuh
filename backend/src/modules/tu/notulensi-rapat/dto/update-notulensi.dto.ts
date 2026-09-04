import {
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateNotulensiDto {
  @IsString()
  @IsOptional()
  judulRapat?: string;

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
  @IsOptional()
  pemimpinRapat?: string;

  @IsString()
  @IsOptional()
  notulis?: string;

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
  @IsOptional()
  keputusanHasil?: string;

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

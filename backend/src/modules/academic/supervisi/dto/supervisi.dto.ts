import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsObject } from 'class-validator';

export class CreateSupervisiDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsNotEmpty()
  jenisId: string;

  @IsString()
  @IsNotEmpty()
  jenisLabel: string;

  @IsString()
  @IsOptional()
  kategori?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  className?: string;

  @IsString()
  @IsOptional()
  subjectName?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsObject()
  @IsNotEmpty()
  scores: Record<string, number>;

  @IsNumber()
  @IsNotEmpty()
  finalScore: number;

  @IsString()
  @IsNotEmpty()
  predicate: string;

  @IsString()
  @IsOptional()
  catatanKekuatan?: string;

  @IsString()
  @IsOptional()
  catatanPerbaikan?: string;

  @IsString()
  @IsOptional()
  rekomendasi?: string;

  @IsString()
  @IsOptional()
  tindakLanjut?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  supervisorName?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateJadwalSupervisiDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsOptional()
  jenisSupervisi?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  className?: string;

  @IsString()
  @IsOptional()
  subjectName?: string;

  @IsString()
  @IsOptional()
  supervisorName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

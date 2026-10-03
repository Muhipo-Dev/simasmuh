import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateExtracurricularDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scheduleDay?: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  pembinaId?: string;

  @IsString()
  @IsNotEmpty()
  pembinaName: string;

  @IsString()
  @IsOptional()
  pembinaNip?: string;

  @IsString()
  @IsOptional()
  pembinaContact?: string;

  @IsString()
  @IsOptional()
  pembina2Name?: string;

  @IsString()
  @IsOptional()
  pembina2Contact?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  targetPeserta?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateExtracurricularDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scheduleDay?: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  pembinaId?: string;

  @IsString()
  @IsOptional()
  pembinaName?: string;

  @IsString()
  @IsOptional()
  pembinaNip?: string;

  @IsString()
  @IsOptional()
  pembinaContact?: string;

  @IsString()
  @IsOptional()
  pembina2Name?: string;

  @IsString()
  @IsOptional()
  pembina2Contact?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  targetPeserta?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  catatan?: string;
}

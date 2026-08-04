import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import {
  StudentOwnershipGuard,
  PaymentProofOwnershipGuard,
  FinanceOperationGuard,
} from './permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    RolesGuard,
    StudentOwnershipGuard,
    PaymentProofOwnershipGuard,
    FinanceOperationGuard,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    StudentOwnershipGuard,
    PaymentProofOwnershipGuard,
    FinanceOperationGuard,
  ],
})
export class AuthModule {}

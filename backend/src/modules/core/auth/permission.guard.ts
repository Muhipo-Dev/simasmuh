import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const studentId = request.params.studentId;

    if (!user || !studentId) {
      return false;
    }

    // Admin IT, SUPERADMIN, and Finance can access all student data
    const isFinance =
      user.role === 'KEUANGAN' ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole2) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole3) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole4) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole5);

    if (user.role === 'ADMIN_IT' || user.role === 'SUPERADMIN' || isFinance) {
      return true;
    }

    // Students can only access their own data
    if (user.role === 'SISWA') {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });

      if (!student || student.userId !== user.id) {
        throw new ForbiddenException(
          'You can only access your own payment data',
        );
      }
    }

    return true;
  }
}

@Injectable()
export class PaymentProofOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const proofId = request.params.id;

    if (!user) {
      return false;
    }

    // Admin IT, SUPERADMIN, and Finance can access all payment proofs
    const isFinance =
      user.role === 'KEUANGAN' ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole2) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole3) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole4) ||
      [
        'KEUANGAN',
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
      ].includes(user.subRole5);

    if (user.role === 'ADMIN_IT' || user.role === 'SUPERADMIN' || isFinance) {
      return true;
    }

    // Students can only access their own payment proofs
    if (user.role === 'SISWA' && proofId) {
      const proof = await this.prisma.paymentProof.findUnique({
        where: { id: proofId },
        include: { student: { select: { userId: true } } },
      });

      if (!proof || proof.student.userId !== user.id) {
        throw new ForbiddenException(
          'You can only access your own payment proofs',
        );
      }
    }

    return true;
  }
}

@Injectable()
export class FinanceOperationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // STRICT: Only dedicated finance staff can perform finance modifications & reset
    const userSubRoles = [
      user.role,
      user.subRole,
      user.subRole2,
      user.subRole3,
      user.subRole4,
      user.subRole5,
    ].filter(Boolean);
    const allowedFinanceRoles = [
      'KEUANGAN',
      'KEUANGAN_ALL',
      'KEUANGAN_MASUK',
      'KEUANGAN_KELUAR',
      'SUPERVISOR_KEUANGAN',
    ];
    const hasFinanceAccess = userSubRoles.some((r) =>
      allowedFinanceRoles.includes(r),
    );

    if (!hasFinanceAccess) {
      throw new ForbiddenException(
        'Akses ditolak. Operasi keuangan hanya dapat dilakukan oleh staf keuangan berwenang.',
      );
    }

    return true;
  }
}

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException(
        'Akses ditolak. Anda harus login terlebih dahulu.',
      );
    }

    const allowedRoles = [
      'SUPERADMIN',
      'ADMIN_IT',
      'ADMIN_TU',
      'KEUANGAN',
      'KEUANGAN_ALL',
      'KEUANGAN_MASUK',
      'KEUANGAN_KELUAR',
      'BAU',
      'TATA_USAHA',
    ];
    const userSubRoles = [
      user.role,
      user.subRole,
      user.subRole2,
      user.subRole3,
      user.subRole4,
      user.subRole5,
    ];
    const hasAccess = userSubRoles.some((r) => allowedRoles.includes(r));

    if (!hasAccess) {
      throw new ForbiddenException(
        'Akses ditolak. Hanya Superadmin, Admin TU, Admin IT, atau Keuangan yang dapat melakukan operasi ini.',
      );
    }

    return true;
  }
}

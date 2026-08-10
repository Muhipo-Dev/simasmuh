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
    if (
      user.role === 'ADMIN_IT' ||
      user.role === 'SUPERADMIN' ||
      user.subRole === 'KEUANGAN' ||
      user.subRole2 === 'KEUANGAN' ||
      user.subRole3 === 'KEUANGAN'
    ) {
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
    if (
      user.role === 'ADMIN_IT' ||
      user.role === 'SUPERADMIN' ||
      user.subRole === 'KEUANGAN' ||
      user.subRole2 === 'KEUANGAN' ||
      user.subRole3 === 'KEUANGAN'
    ) {
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

    // Admin IT, SUPERADMIN, ADMIN_TU, BAU, and Finance staff can perform financial operations
    const hasFinanceAccess =
      user.role === 'ADMIN_IT' ||
      user.role === 'SUPERADMIN' ||
      user.role === 'ADMIN_TU' ||
      user.role === 'BAU' ||
      user.role === 'TATA_USAHA' ||
      user.subRole === 'KEUANGAN' ||
      user.subRole === 'ADMIN_TU' ||
      user.subRole === 'BAU' ||
      user.subRole === 'TATA_USAHA' ||
      user.subRole2 === 'KEUANGAN' ||
      user.subRole3 === 'KEUANGAN';

    if (!hasFinanceAccess) {
      throw new ForbiddenException(
        'Access denied. Finance permissions required',
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

    const allowedRoles = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'KEUANGAN', 'BAU', 'TATA_USAHA'];
    const hasAccess =
      allowedRoles.includes(user.role) ||
      allowedRoles.includes(user.subRole) ||
      allowedRoles.includes(user.subRole2) ||
      allowedRoles.includes(user.subRole3);

    if (!hasAccess) {
      throw new ForbiddenException(
        'Akses ditolak. Hanya Superadmin, Admin TU, Admin IT, atau Keuangan yang dapat melakukan operasi ini.',
      );
    }

    return true;
  }
}

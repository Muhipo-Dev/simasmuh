import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ROLES_KEY,
  PERMISSIONS_KEY,
  PaymentPermission,
  UserRole,
  SubRole,
} from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check roles
    if (requiredRoles && !this.hasRequiredRoles(user, requiredRoles)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Check permissions
    if (
      requiredPermissions &&
      !this.hasRequiredPermissions(user, requiredPermissions)
    ) {
      throw new ForbiddenException(`Access denied. Insufficient permissions`);
    }

    return true;
  }

  private hasRequiredRoles(user: any, requiredRoles: string[]): boolean {
    return requiredRoles.some(
      (role) =>
        user.role === role ||
        user.subRole === role ||
        user.subRole2 === role ||
        user.subRole3 === role,
    );
  }

  private hasRequiredPermissions(
    user: any,
    requiredPermissions: string[],
  ): boolean {
    const userPermissions = this.getUserPermissions(user);
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  private getUserPermissions(user: any): string[] {
    const permissions: string[] = [];

    // Admin IT and SUPERADMIN have all permissions
    if (
      user.role === UserRole.ADMIN_IT ||
      user.role === 'SUPERADMIN'
    ) {
      return Object.values(PaymentPermission);
    }

    // Student and Parent (WALI_MURID) permissions
    if (
      user.role === UserRole.SISWA ||
      user.role === 'WALI_MURID' ||
      user.role === 'PARENT' ||
      user.role === 'ORANG_TUA'
    ) {
      permissions.push(
        PaymentPermission.VIEW_OWN_BILLS,
        PaymentPermission.UPLOAD_PAYMENT_PROOF,
        PaymentPermission.VIEW_OWN_PAYMENT_HISTORY,
      );
    }

    // Finance (Keuangan) permissions
    if (
      user.role === UserRole.KEUANGAN ||
      user.subRole === SubRole.KEUANGAN ||
      user.subRole2 === SubRole.KEUANGAN ||
      user.subRole3 === SubRole.KEUANGAN
    ) {
      permissions.push(
        PaymentPermission.VIEW_ALL_BILLS,
        PaymentPermission.CREATE_BILLS,
        PaymentPermission.UPDATE_BILLS,
        PaymentPermission.DELETE_BILLS,
        PaymentPermission.VERIFY_PAYMENTS,
        PaymentPermission.VIEW_FINANCIAL_REPORTS,
        PaymentPermission.GENERATE_MASS_BILLS,
        PaymentPermission.BULK_OPERATIONS,
      );
    }

    // Headmaster (KEPALA_SEKOLAH) supervisory permissions (read-only reports & bills)
    if (
      user.role === UserRole.KEPALA_SEKOLAH ||
      user.subRole === SubRole.KEPALA_SEKOLAH ||
      user.subRole2 === SubRole.KEPALA_SEKOLAH ||
      user.subRole3 === SubRole.KEPALA_SEKOLAH
    ) {
      permissions.push(
        PaymentPermission.VIEW_ALL_BILLS,
        PaymentPermission.VIEW_FINANCIAL_REPORTS,
        PaymentPermission.VIEW_OWN_BILLS,
        PaymentPermission.VIEW_OWN_PAYMENT_HISTORY,
      );
    }

    // Teacher/Staff general permissions
    if (user.role === UserRole.GURU || user.role === UserRole.KARYAWAN) {
      // Teachers/Staff can view their own payment info if they are also students in some cases
      permissions.push(
        PaymentPermission.VIEW_OWN_BILLS,
        PaymentPermission.VIEW_OWN_PAYMENT_HISTORY,
      );
    }

    return permissions;
  }
}

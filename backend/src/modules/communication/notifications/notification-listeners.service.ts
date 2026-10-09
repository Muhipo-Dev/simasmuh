import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentNotificationsService } from './payment-notifications.service';
import { EmailNotificationService } from './email.service';

@Injectable()
export class NotificationListenersService {
  private readonly logger = new Logger(NotificationListenersService.name);

  constructor(
    private paymentNotificationsService: PaymentNotificationsService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  /**
   * Listen for payroll published events
   */
  @OnEvent('payroll.published')
  async handlePayrollPublished(event: {
    toEmail: string;
    employeeName: string;
    periodFormatted: string;
    netSalaryFormatted: string;
    totalHours?: number;
    attendanceDays?: number;
    bankAccountInfo?: string;
  }) {
    this.logger.log(`Handling payroll published email event to: ${event.toEmail}`);
    try {
      await this.emailNotificationService.sendPayrollNotification(event);
    } catch (e: any) {
      this.logger.error(`Failed to send payroll email to ${event.toEmail}: ${e.message}`);
    }
  }

  /**
   * Listen for leave approved/rejected events
   */
  @OnEvent('leave.status_changed')
  async handleLeaveStatusChanged(event: {
    toEmail: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: 'DISETUJUI' | 'DITOLAK' | 'MENUNGGU';
    approverName?: string;
    notes?: string;
  }) {
    this.logger.log(`Handling leave notification event to: ${event.toEmail}`);
    try {
      await this.emailNotificationService.sendLeaveNotification(event);
    } catch (e: any) {
      this.logger.error(`Failed to send leave email to ${event.toEmail}: ${e.message}`);
    }
  }

  /**
   * Listen for disposisi assigned events
   */
  @OnEvent('disposisi.assigned')
  async handleDisposisiAssigned(event: {
    toEmail: string;
    employeeName: string;
    mailNumber: string;
    perihal: string;
    senderAgency: string;
    instructionText: string;
  }) {
    this.logger.log(`Handling disposisi notification event to: ${event.toEmail}`);
    try {
      await this.emailNotificationService.sendDisposisiNotification(event);
    } catch (e: any) {
      this.logger.error(`Failed to send disposisi email to ${event.toEmail}: ${e.message}`);
    }
  }

  /**
   * Listen for teaching device verification events
   */
  @OnEvent('perangkat_ajar.verified')
  async handleTeachingDeviceVerified(event: {
    toEmail: string;
    teacherName: string;
    subjectName: string;
    className: string;
    deviceType: string;
    status: string;
    supervisorName: string;
    feedback?: string;
  }) {
    this.logger.log(`Handling teaching device notification event to: ${event.toEmail}`);
    try {
      await this.emailNotificationService.sendTeachingDeviceNotification(event);
    } catch (e: any) {
      this.logger.error(`Failed to send teaching device email to ${event.toEmail}: ${e.message}`);
    }
  }

  /**
   * Listen for tagihan creation events
   */
  @OnEvent('tagihan.created')
  async handleTagihanCreated(event: {
    tagihanId: string;
    studentId: string;
    createdBy?: string;
    isBulk?: boolean;
    bulkData?: {
      classId: string;
      tagihanType: string;
      amount: number;
      count: number;
    };
  }) {
    this.logger.log(`Handling tagihan created event: ${event.tagihanId}`);

    if (event.isBulk && event.bulkData) {
      await this.paymentNotificationsService.notifyBulkTagihanCreated(
        event.bulkData.classId,
        event.bulkData.tagihanType,
        event.bulkData.amount,
        event.bulkData.count,
        event.createdBy,
      );
    } else {
      await this.paymentNotificationsService.notifyTagihanCreated(
        event.tagihanId,
        event.studentId,
        event.createdBy,
      );
    }
  }

  /**
   * Listen for payment proof upload events
   */
  @OnEvent('payment-proof.uploaded')
  async handlePaymentProofUploaded(event: {
    proofId: string;
    studentId: string;
    uploadedBy: string;
  }) {
    this.logger.log(`Handling payment proof uploaded event: ${event.proofId}`);
    await this.paymentNotificationsService.notifyPaymentProofUploaded(
      event.proofId,
    );
  }

  /**
   * Listen for payment proof verification events
   */
  @OnEvent('payment-proof.verified')
  async handlePaymentProofVerified(event: {
    proofId: string;
    status: 'DIVERIFIKASI' | 'DITOLAK';
    verifiedBy: string;
    notes?: string;
  }) {
    this.logger.log(
      `Handling payment proof verified event: ${event.proofId} - ${event.status}`,
    );
    await this.paymentNotificationsService.notifyPaymentProofVerified(
      event.proofId,
      event.status,
      event.verifiedBy,
      event.notes,
    );
  }

  /**
   * Listen for security incidents
   */
  @OnEvent('security.incident')
  async handleSecurityIncident(event: {
    userId: string;
    incidentType: string;
    details: any;
  }) {
    this.logger.log(
      `Handling security incident: ${event.incidentType} for user ${event.userId}`,
    );
    await this.paymentNotificationsService.notifySecurityIncident(
      event.userId,
      event.incidentType,
      event.details,
    );
  }

  /**
   * Listen for file quarantine events
   */
  @OnEvent('file.quarantined')
  async handleFileQuarantined(event: {
    userId: string;
    fileName: string;
    reason: string;
    filePath: string;
  }) {
    this.logger.log(`Handling file quarantined event: ${event.fileName}`);
    await this.paymentNotificationsService.notifySecurityIncident(
      event.userId,
      'FILE_QUARANTINED',
      {
        fileName: event.fileName,
        reason: event.reason,
        filePath: event.filePath,
      },
    );
  }
}

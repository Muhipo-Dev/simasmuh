import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentNotificationsService } from './payment-notifications.service';

@Injectable()
export class NotificationListenersService {
  private readonly logger = new Logger(NotificationListenersService.name);

  constructor(
    private paymentNotificationsService: PaymentNotificationsService,
  ) {}

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
    await this.paymentNotificationsService.notifyPaymentProofUploaded(event.proofId);
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
    this.logger.log(`Handling payment proof verified event: ${event.proofId} - ${event.status}`);
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
    this.logger.log(`Handling security incident: ${event.incidentType} for user ${event.userId}`);
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
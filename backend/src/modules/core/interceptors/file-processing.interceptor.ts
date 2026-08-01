import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileSecurityUtil } from '../utils/file-security.util';
import { VirusScannerUtil } from '../utils/virus-scanner.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class FileProcessingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileProcessingInterceptor.name);

  constructor(private eventEmitter: EventEmitter2) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const file = request.file as Express.Multer.File;

    if (!file) {
      return next.handle();
    }

    try {
      // Perform comprehensive file validation
      const validationResult = await FileSecurityUtil.validateFile(file);

      if (!validationResult.isValid) {
        // Clean up the uploaded file
        await this.cleanupFile(file.path);
        throw new BadRequestException(validationResult.error);
      }

      // Store metadata for further processing
      request.fileMetadata = {
        originalValidation: validationResult.metadata,
        securityScan: validationResult.metadata?.scanResult,
        processedAt: new Date(),
        fileHash: validationResult.metadata?.hash,
      };

      // If this is a high-risk file type, perform additional processing
      if (this.isHighRiskFileType(file.mimetype)) {
        await this.processHighRiskFile(file, request);
      }

      // Log file upload activity
      this.logger.log(`File processed successfully: ${file.originalname} (${file.mimetype})`);

      // Emit file processing event for audit
      this.eventEmitter.emit('file.processed', {
        userId: request.user?.id,
        fileName: file.originalname,
        fileSize: file.size,
        mimetype: file.mimetype,
        securityStatus: 'clean',
        timestamp: new Date(),
      });

    } catch (error) {
      // Clean up file on error
      await this.cleanupFile(file.path);
      
      // Emit security event if needed
      if (error.message.includes('Security scan failed') || error.message.includes('Suspicious')) {
        this.eventEmitter.emit('security.incident', {
          userId: request.user?.id,
          incidentType: 'MALICIOUS_FILE_UPLOAD',
          details: {
            fileName: file.originalname,
            fileSize: file.size,
            mimetype: file.mimetype,
            error: error.message,
          },
        });
      }

      throw error;
    }

    return next.handle();
  }

  /**
   * Check if file type requires additional processing
   */
  private isHighRiskFileType(mimetype: string): boolean {
    const highRiskTypes = [
      'application/pdf',
      'image/svg+xml',
      'application/zip',
      'application/x-rar-compressed',
    ];
    
    return highRiskTypes.includes(mimetype);
  }

  /**
   * Process high-risk files with additional security measures
   */
  private async processHighRiskFile(file: Express.Multer.File, request: any): Promise<void> {
    if (file.mimetype.startsWith('image/')) {
      // For images, create sanitized version
      const outputPath = file.path.replace(path.extname(file.path), '_sanitized' + path.extname(file.path));
      
      try {
        await FileSecurityUtil.processAndOptimizeImage(file.path, outputPath, {
          removeMetadata: true,
          quality: 85,
          maxWidth: 1920,
          maxHeight: 1080,
        });

        // Replace original with sanitized version
        await fs.rename(outputPath, file.path);
        
        request.fileMetadata.sanitized = true;
        this.logger.log(`Image sanitized: ${file.originalname}`);
        
      } catch (error) {
        this.logger.error(`Image sanitization failed: ${error.message}`);
        throw new BadRequestException('Image processing failed');
      }
    }

    if (file.mimetype === 'application/pdf') {
      // Additional PDF security checks
      const buffer = await fs.readFile(file.path);
      const content = buffer.toString('binary');
      
      // Check for dangerous PDF features
      const dangerousFeatures = [
        '/JavaScript',
        '/JS', 
        '/OpenAction',
        '/Launch',
        '/EmbeddedFile',
        '/XFA',
        '/RichMedia',
        '/Flash',
        '/Sound',
        '/Movie',
      ];

      const foundFeatures = dangerousFeatures.filter(feature => content.includes(feature));
      
      if (foundFeatures.length > 0) {
        this.logger.warn(`PDF contains dangerous features: ${foundFeatures.join(', ')}`);
        
        // For now, we'll allow but log. In production, you might want to block or sanitize
        request.fileMetadata.pdfWarnings = foundFeatures;
        
        this.eventEmitter.emit('security.incident', {
          userId: request.user?.id,
          incidentType: 'SUSPICIOUS_PDF_CONTENT',
          details: {
            fileName: file.originalname,
            dangerousFeatures: foundFeatures,
          },
        });
      }
    }
  }

  /**
   * Clean up uploaded file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }
}
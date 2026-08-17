import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { STORAGE_DIRS } from '../config/storage.config';

const execFileAsync = promisify(execFile);

export interface ScanResult {
  isClean: boolean;
  threats?: string[];
  scanTime: number;
  fileSize: number;
  scanEngine: string;
}

@Injectable()
export class VirusScannerUtil {
  private static readonly logger = new Logger(VirusScannerUtil.name);
  private static eventEmitter: EventEmitter2;

  constructor(private eventEmitter2: EventEmitter2) {
    VirusScannerUtil.eventEmitter = this.eventEmitter2;
  }

  /**
   * Scan file for malware and threats
   */
  static async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();

    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Basic security checks first
      const basicChecks = await this.performBasicSecurityChecks(filePath);
      if (!basicChecks.isClean) {
        return {
          isClean: false,
          threats: basicChecks.threats,
          scanTime: Date.now() - startTime,
          fileSize,
          scanEngine: 'basic-checks',
        };
      }

      // Try ClamAV if available
      const clamAvResult = await this.scanWithClamAV(filePath);
      if (clamAvResult) {
        return {
          ...clamAvResult,
          scanTime: Date.now() - startTime,
          fileSize,
        };
      }

      // Fallback to pattern-based scanning
      const patternResult = await this.scanWithPatterns(filePath);

      return {
        isClean: patternResult.isClean,
        threats: patternResult.threats,
        scanTime: Date.now() - startTime,
        fileSize,
        scanEngine: 'pattern-based',
      };
    } catch (error) {
      this.logger.error(`Virus scan failed for ${filePath}: ${error.message}`);

      // In case of scan failure, be conservative and flag as suspicious
      return {
        isClean: false,
        threats: ['SCAN_ERROR', error.message],
        scanTime: Date.now() - startTime,
        fileSize: 0,
        scanEngine: 'error',
      };
    }
  }

  /**
   * Perform basic security checks
   */
  private static async performBasicSecurityChecks(filePath: string): Promise<{
    isClean: boolean;
    threats: string[];
  }> {
    const threats: string[] = [];

    try {
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const dangerousExtensions = [
        '.exe',
        '.bat',
        '.cmd',
        '.scr',
        '.pif',
        '.com',
        '.jar',
        '.vbs',
        '.ps1',
        '.sh',
        '.php',
        '.asp',
        '.aspx',
        '.jsp',
      ];

      if (dangerousExtensions.includes(ext)) {
        threats.push(`DANGEROUS_EXTENSION_${ext.substring(1).toUpperCase()}`);
      }

      // Check file size (files over 50MB are suspicious for uploads)
      const stats = await fs.stat(filePath);
      if (stats.size > 50 * 1024 * 1024) {
        threats.push('OVERSIZED_FILE');
      }

      // Read first few bytes to check for executable signatures
      const buffer = await fs.readFile(filePath, { encoding: null });
      const header = buffer.slice(0, 16);

      // Check for executable signatures
      const executableSignatures = [
        [0x4d, 0x5a], // PE executable (MZ)
        [0x7f, 0x45, 0x4c, 0x46], // ELF executable
        [0xca, 0xfe, 0xba, 0xbe], // Mach-O executable
        [0xfe, 0xed, 0xfa, 0xce], // Mach-O executable (reverse)
      ];

      for (const signature of executableSignatures) {
        if (this.matchesSignature(header, signature)) {
          threats.push('EXECUTABLE_SIGNATURE');
          break;
        }
      }

      // Check for embedded scripts in images
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        const content = buffer.toString('binary');
        const scriptPatterns = [
          /<script/i,
          /javascript:/i,
          /eval\(/i,
          /document\./i,
          /window\./i,
        ];

        for (const pattern of scriptPatterns) {
          if (pattern.test(content)) {
            threats.push('EMBEDDED_SCRIPT');
            break;
          }
        }
      }

      // Check for suspicious PDF content
      if (ext === '.pdf') {
        const content = buffer.toString('binary');
        const suspiciousPatterns = [
          '/JavaScript',
          '/JS',
          '/OpenAction',
          '/Launch',
          '/EmbeddedFile',
          '/XFA',
          '/RichMedia',
          '/Flash',
        ];

        for (const pattern of suspiciousPatterns) {
          if (content.includes(pattern)) {
            threats.push(`PDF_${pattern.replace('/', '').toUpperCase()}`);
          }
        }
      }

      return {
        isClean: threats.length === 0,
        threats,
      };
    } catch (error) {
      this.logger.error(`Basic security check failed: ${error.message}`);
      return {
        isClean: false,
        threats: ['BASIC_CHECK_ERROR'],
      };
    }
  }

  /**
   * Scan with ClamAV if available
   */
  private static async scanWithClamAV(
    filePath: string,
  ): Promise<ScanResult | null> {
    try {
      // Check if ClamAV is available
      await execFileAsync('which', ['clamscan'], { timeout: 5000 });

      // Run ClamAV scan
      const { stdout, stderr } = await execFileAsync(
        'clamscan',
        ['--no-summary', filePath],
        {
          timeout: 30000,
        },
      );

      const isClean = !stdout.includes('FOUND') && !stderr.includes('FOUND');
      const threats: string[] = [];

      if (!isClean) {
        // Parse ClamAV output for threat names
        const lines = (stdout + stderr).split('\n');
        for (const line of lines) {
          if (line.includes('FOUND')) {
            const match = line.match(/:\s*(.+?)\s+FOUND/);
            if (match) {
              threats.push(match[1]);
            }
          }
        }
      }

      return {
        isClean,
        threats: threats.length > 0 ? threats : undefined,
        scanTime: 0, // Will be set by caller
        fileSize: 0, // Will be set by caller
        scanEngine: 'clamav',
      };
    } catch (error) {
      // ClamAV not available or failed
      this.logger.warn(`ClamAV scan failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Pattern-based malware detection
   */
  private static async scanWithPatterns(filePath: string): Promise<{
    isClean: boolean;
    threats: string[];
  }> {
    const threats: string[] = [];

    try {
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('binary');

      const ext = path.extname(filePath).toLowerCase();
      const isBinaryFormat = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.pdf',
      ].includes(ext);

      // Common malware patterns
      const malwarePatterns = [
        // Suspicious strings
        { pattern: /CreateRemoteThread/gi, threat: 'PROCESS_INJECTION' },
        { pattern: /VirtualAllocEx/gi, threat: 'MEMORY_ALLOCATION' },
        { pattern: /WriteProcessMemory/gi, threat: 'MEMORY_WRITE' },
        { pattern: /LoadLibraryA/gi, threat: 'LIBRARY_INJECTION' },
        { pattern: /GetProcAddress/gi, threat: 'API_RESOLUTION' },

        // Network activity
        {
          pattern: /InternetOpenA|InternetConnectA|HttpOpenRequestA/gi,
          threat: 'NETWORK_ACTIVITY',
        },
        {
          pattern: /WSAStartup|socket|connect|send|recv/gi,
          threat: 'SOCKET_ACTIVITY',
        },

        // Registry manipulation
        {
          pattern: /RegOpenKeyEx|RegSetValueEx|RegCreateKeyEx/gi,
          threat: 'REGISTRY_MODIFICATION',
        },

        // File system operations
        {
          pattern: /CreateFileA|WriteFile|DeleteFileA/gi,
          threat: 'FILE_MANIPULATION',
        },

        // Suspicious behaviors
        {
          pattern: /keylogger|password|credential/gi,
          threat: 'CREDENTIAL_THEFT',
        },
        { pattern: /crypto|bitcoin|wallet/gi, threat: 'CRYPTOCURRENCY_MINER' },
        { pattern: /ransomware|encrypt.*files/gi, threat: 'RANSOMWARE' },
      ];

      for (const { pattern, threat } of malwarePatterns) {
        if (pattern.test(content)) {
          threats.push(threat);
        }
      }

      // Skip obfuscation and entropy checks for binary formats like images/PDFs
      // because they naturally have high entropy and non-printable characters.
      if (!isBinaryFormat) {
        // Check for obfuscation
        const suspiciousCharRatio =
          this.calculateSuspiciousCharacterRatio(content);
        if (suspiciousCharRatio > 0.3) {
          threats.push('OBFUSCATED_CONTENT');
        }

        // Check for excessive entropy (packed/encrypted content)
        const entropy = this.calculateEntropy(buffer);
        if (entropy > 7.5) {
          threats.push('HIGH_ENTROPY');
        }
      }

      return {
        isClean: threats.length === 0,
        threats,
      };
    } catch (error) {
      this.logger.error(`Pattern scan failed: ${error.message}`);
      return {
        isClean: false,
        threats: ['PATTERN_SCAN_ERROR'],
      };
    }
  }

  /**
   * Quarantine suspicious file
   */
  static async quarantineFile(filePath: string, reason: string): Promise<void> {
    try {
      const quarantineDir = STORAGE_DIRS.quarantine;
      await fs.mkdir(quarantineDir, { recursive: true });

      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const quarantinePath = path.join(
        quarantineDir,
        `${timestamp}_${fileName}`,
      );

      // Move file to quarantine
      await fs.rename(filePath, quarantinePath);

      // Create metadata file
      const metadata = {
        originalPath: filePath,
        quarantineReason: reason,
        quarantineTime: new Date().toISOString(),
        fileSize: (await fs.stat(quarantinePath)).size,
      };

      await fs.writeFile(
        `${quarantinePath}.meta`,
        JSON.stringify(metadata, null, 2),
      );

      this.logger.warn(
        `File quarantined: ${filePath} -> ${quarantinePath} (${reason})`,
      );

      // Emit security event
      if (this.eventEmitter) {
        this.eventEmitter.emit('file.quarantined', {
          originalPath: filePath,
          quarantinePath,
          reason,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to quarantine file ${filePath}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Helper method to check signature match
   */
  private static matchesSignature(
    buffer: Buffer,
    signature: number[],
  ): boolean {
    if (buffer.length < signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }

    return true;
  }

  /**
   * Calculate ratio of suspicious characters
   */
  private static calculateSuspiciousCharacterRatio(content: string): number {
    const suspiciousChars = content.match(/[^\x20-\x7E\r\n\t]/g);
    return suspiciousChars ? suspiciousChars.length / content.length : 0;
  }

  /**
   * Calculate Shannon entropy of data
   */
  private static calculateEntropy(buffer: Buffer): number {
    const frequency: { [key: number]: number } = {};

    // Count byte frequencies
    for (const byte of buffer) {
      frequency[byte] = (frequency[byte] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    for (const count of Object.values(frequency)) {
      const probability = count / buffer.length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Get quarantine directory status
   */
  static async getQuarantineStatus(): Promise<{
    fileCount: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    try {
      const quarantineDir = STORAGE_DIRS.quarantine;

      try {
        await fs.access(quarantineDir);
      } catch {
        // Directory doesn't exist
        return { fileCount: 0, totalSize: 0 };
      }

      const files = await fs.readdir(quarantineDir);
      const quarantineFiles = files.filter((f) => !f.endsWith('.meta'));

      if (quarantineFiles.length === 0) {
        return { fileCount: 0, totalSize: 0 };
      }

      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;

      for (const file of quarantineFiles) {
        const filePath = path.join(quarantineDir, file);
        const stats = await fs.stat(filePath);

        totalSize += stats.size;
        oldestTime = Math.min(oldestTime, stats.ctimeMs);
        newestTime = Math.max(newestTime, stats.ctimeMs);
      }

      return {
        fileCount: quarantineFiles.length,
        totalSize,
        oldestFile: new Date(oldestTime),
        newestFile: new Date(newestTime),
      };
    } catch (error) {
      VirusScannerUtil.logger.error(
        `Failed to get quarantine status: ${error.message}`,
      );
      return { fileCount: 0, totalSize: 0 };
    }
  }

  /**
   * Clean old quarantine files (older than 30 days)
   */
  static async cleanOldQuarantineFiles(
    maxAgeMs: number = 30 * 24 * 60 * 60 * 1000,
  ): Promise<number> {
    try {
      const quarantineDir = STORAGE_DIRS.quarantine;

      try {
        await fs.access(quarantineDir);
      } catch {
        // Directory doesn't exist
        return 0;
      }

      const files = await fs.readdir(quarantineDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(quarantineDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.ctimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      this.logger.log(`Cleaned ${deletedCount} old quarantine files`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to clean quarantine files: ${error.message}`);
      return 0;
    }
  }
}

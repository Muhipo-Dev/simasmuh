import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';

/**
 * Service pembuat dokumen Word (.docx) murni berbasis standar OpenXML (ISO/IEC 29500)
 * dan generator bundel ZIP (PKZIP spec) dengan Node.js native Buffer & zlib tanpa dependensi external bermasalah.
 */
@Injectable()
export class DocxGeneratorService {
  private readonly logger = new Logger(DocxGeneratorService.name);

  /**
   * Escape XML entity strings
   */
  private escapeXml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Membuat file .docx lengkap dengan format standar institusi SMA Muhammadiyah 1 Ponorogo
   */
  createDocxDocument(options: {
    title: string;
    subtitle?: string;
    schoolName?: string;
    kopData?: {
      schoolName: string;
      address: string;
      phone?: string;
      email?: string;
      principalName?: string;
      principalNip?: string;
    };
    meta?: {
      guruName?: string;
      nip?: string;
      mataPelajaran?: string;
      kelas?: string;
      fase?: string;
      tahunAjaran?: string;
      semester?: string;
    };
    sections: {
      heading: string;
      content?: string;
      table?: {
        headers: string[];
        rows: string[][];
      };
      bulletPoints?: string[];
    }[];
  }): Buffer {
    const school = options.kopData?.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO';
    const address = options.kopData?.address || 'Jl. Budi Utomo No. 10, Ponorogo, Jawa Timur';
    const phone = options.kopData?.phone || '(0352) 481521';
    const email = options.kopData?.email || 'smamuhipo@gmail.com';

    let bodyXml = '';

    // 1. KOP SURAT RESMI SEKOLAH
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="28"/>
            <w:color w:val="1E3A8A"/>
          </w:rPr>
          <w:t>${this.escapeXml(school.toUpperCase())}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="0" w:after="40" w:line="220" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:i/>
            <w:sz w:val="20"/>
            <w:color w:val="475569"/>
          </w:rPr>
          <w:t>TERAKREDITASI "A" (UNGGUL) &amp; IMPLEMENTASI KURIKULUM MERDEKA</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="0" w:after="80" w:line="200" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:sz w:val="18"/>
            <w:color w:val="64748B"/>
          </w:rPr>
          <w:t>${this.escapeXml(address)} | Telp: ${this.escapeXml(phone)} | Email: ${this.escapeXml(email)}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr>
          <w:pBdr>
            <w:bottom w:val="double" w:sz="18" w:space="1" w:color="1E3A8A"/>
          </w:pBdr>
          <w:spacing w:before="0" w:after="160"/>
        </w:pPr>
      </w:p>
    `;

    // 2. JUDUL DOKUMEN & SUBTITLE
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="120" w:after="60"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="30"/>
            <w:color w:val="0F172A"/>
          </w:rPr>
          <w:t>${this.escapeXml(options.title.toUpperCase())}</w:t>
        </w:r>
      </w:p>
    `;

    if (options.subtitle) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:before="0" w:after="160"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:sz w:val="22"/>
              <w:color w:val="334155"/>
            </w:rPr>
            <w:t>${this.escapeXml(options.subtitle)}</w:t>
          </w:r>
        </w:p>
      `;
    }

    // 3. TABEL IDENTITAS / METADATA
    if (options.meta) {
      const m = options.meta;
      const metaRows: [string, string][] = [
        ['Satuan Pendidikan', school],
        ['Mata Pelajaran', m.mataPelajaran || '-'],
        ['Kelas / Fase', `${m.kelas || '-'} (${m.fase || 'Fase E'})`],
        ['Tahun Ajaran / Semester', `${m.tahunAjaran || '2025/2026'} / ${m.semester || 'GANJIL'}`],
        ['Guru Pengampu', `${m.guruName || '-'} (NIP/NBM: ${m.nip || '-'})`],
      ];

      bodyXml += `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="9200" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
              <w:left w:val="none"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
              <w:right w:val="none"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="F1F5F9"/>
              <w:insideV w:val="none"/>
            </w:tblBorders>
          </w:tblPr>
      `;

      for (const [k, v] of metaRows) {
        bodyXml += `
          <w:tr>
            <w:trPr><w:cantSplit/></w:trPr>
            <w:tc>
              <w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr>
              <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="475569"/></w:rPr><w:t>${this.escapeXml(k)}</w:t></w:r></w:p>
            </w:tc>
            <w:tc>
              <w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr>
              <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>:</w:t></w:r></w:p>
            </w:tc>
            <w:tc>
              <w:tcPr><w:tcW w:w="5600" w:type="dxa"/></w:tcPr>
              <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="19"/><w:color w:val="0F172A"/></w:rPr><w:t>${this.escapeXml(v)}</w:t></w:r></w:p>
            </w:tc>
          </w:tr>
        `;
      }
      bodyXml += `</w:tbl><w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>`;
    }

    // 4. KONTEN SEKSI
    for (const section of options.sections) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:spacing w:before="200" w:after="80"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:sz w:val="23"/>
              <w:color w:val="1E3A8A"/>
            </w:rPr>
            <w:t>${this.escapeXml(section.heading)}</w:t>
          </w:r>
        </w:p>
      `;

      if (section.content) {
        const paragraphs = section.content.split('\n').filter(Boolean);
        for (const p of paragraphs) {
          bodyXml += `
            <w:p>
              <w:pPr>
                <w:spacing w:before="40" w:after="60" w:line="240" w:lineRule="auto"/>
                <w:jc w:val="both"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:sz w:val="20"/>
                  <w:color w:val="334155"/>
                </w:rPr>
                <w:t>${this.escapeXml(p)}</w:t>
              </w:r>
            </w:p>
          `;
        }
      }

      if (section.bulletPoints && section.bulletPoints.length > 0) {
        for (const b of section.bulletPoints) {
          bodyXml += `
            <w:p>
              <w:pPr>
                <w:ind w:left="360" w:hanging="240"/>
                <w:spacing w:before="30" w:after="40"/>
              </w:pPr>
              <w:r>
                <w:rPr><w:b/><w:color w:val="1E3A8A"/></w:rPr>
                <w:t>• </w:t>
              </w:r>
              <w:r>
                <w:rPr><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr>
                <w:t>${this.escapeXml(b)}</w:t>
              </w:r>
            </w:p>
          `;
        }
      }

      if (section.table && section.table.headers && section.table.rows) {
        bodyXml += `
          <w:tbl>
            <w:tblPr>
              <w:tblW w:w="9200" w:type="dxa"/>
              <w:jc w:val="center"/>
              <w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
              </w:tblBorders>
            </w:tblPr>
        `;

        // Header Row
        bodyXml += `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>`;
        for (const h of section.table.headers) {
          bodyXml += `
            <w:tc>
              <w:tcPr>
                <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
                <w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar>
              </w:tcPr>
              <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr>
                <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${this.escapeXml(h)}</w:t></w:r>
              </w:p>
            </w:tc>
          `;
        }
        bodyXml += `</w:tr>`;

        // Body Rows
        for (const row of section.table.rows) {
          bodyXml += `<w:tr><w:trPr><w:cantSplit/></w:trPr>`;
          for (const cell of row) {
            bodyXml += `
              <w:tc>
                <w:tcPr>
                  <w:tcMar><w:top w:w="80"/><w:bottom w:w="80"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar>
                </w:tcPr>
                <w:p>
                  <w:pPr><w:spacing w:before="30" w:after="30"/></w:pPr>
                  <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t>${this.escapeXml(cell)}</w:t></w:r>
                </w:p>
              </w:tc>
            `;
          }
          bodyXml += `</w:tr>`;
        }
        bodyXml += `</w:tbl><w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
      }
    }

    // 5. TANDA TANGAN (KOLOM GURU & KEPALA SEKOLAH)
    const guruName = options.meta?.guruName || 'Guru Mata Pelajaran';
    const guruNip = options.meta?.nip ? `NIP/NBM. ${options.meta.nip}` : '';
    const principalName = options.kopData?.principalName || 'Sugeng Riadi, M.Pd.';
    const principalNip = options.kopData?.principalNip ? `NIP/NBM. ${options.kopData.principalNip}` : 'NBM. 1092837';

    bodyXml += `
      <w:p><w:pPr><w:spacing w:before="240" w:after="60"/></w:pPr></w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9200" w:type="dxa"/>
          <w:jc w:val="center"/>
          <w:tblBorders>
            <w:top w:val="none"/>
            <w:left w:val="none"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="none"/>
            <w:insideV w:val="none"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tr>
          <w:tc>
            <w:tcPr><w:tcW w:w="4600" w:type="dxa"/></w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>Mengetahui,</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="600"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>Kepala Sekolah</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${this.escapeXml(principalName)}</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>${this.escapeXml(principalNip)}</w:t></w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="4600" w:type="dxa"/></w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>Ponorogo, ....................................</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="600"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>Guru Mata Pelajaran</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${this.escapeXml(guruName)}</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>${this.escapeXml(guruNip)}</w:t></w:r>
            </w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
    `;

    // 6. RAKIT STANDAR OPENXML PACKAGE (.docx)
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

    const zipFiles: { name: string; content: Buffer }[] = [
      { name: '[Content_Types].xml', content: Buffer.from(contentTypesXml, 'utf-8') },
      { name: '_rels/.rels', content: Buffer.from(relsXml, 'utf-8') },
      { name: 'word/_rels/document.xml.rels', content: Buffer.from(wordRelsXml, 'utf-8') },
      { name: 'word/document.xml', content: Buffer.from(documentXml, 'utf-8') },
    ];

    return this.createZipArchive(zipFiles);
  }

  /**
   * Pembuat arsip format ZIP standar (PKZIP) murni Node.js Buffer dengan deflating
   */
  createZipArchive(files: { name: string; content: Buffer }[]): Buffer {
    const fileEntries: {
      name: string;
      compressedData: Buffer;
      crc: number;
      uncompressedSize: number;
      compressedSize: number;
      headerOffset: number;
    }[] = [];

    const localParts: Buffer[] = [];
    let currentOffset = 0;

    for (const file of files) {
      const uncompressed = file.content;
      const crc = this.calculateCrc32(uncompressed);
      const deflated = zlib.deflateRawSync(uncompressed, { level: 6 });
      const nameBuffer = Buffer.from(file.name, 'utf8');

      // Local File Header (30 bytes + name length)
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
      localHeader.writeUInt16LE(0x0800, 6);     // General purpose bit flag (UTF-8)
      localHeader.writeUInt16LE(8, 8);          // Compression method: 8 = Deflate
      localHeader.writeUInt16LE(0, 10);         // Last mod file time
      localHeader.writeUInt16LE(0x5021, 12);    // Last mod file date
      localHeader.writeUInt32LE(crc, 14);       // CRC-32
      localHeader.writeUInt32LE(deflated.length, 18);   // Compressed size
      localHeader.writeUInt32LE(uncompressed.length, 22); // Uncompressed size
      localHeader.writeUInt16LE(nameBuffer.length, 26);  // File name length
      localHeader.writeUInt16LE(0, 28);                  // Extra field length

      fileEntries.push({
        name: file.name,
        compressedData: deflated,
        crc,
        uncompressedSize: uncompressed.length,
        compressedSize: deflated.length,
        headerOffset: currentOffset,
      });

      localParts.push(localHeader, nameBuffer, deflated);
      currentOffset += 30 + nameBuffer.length + deflated.length;
    }

    const centralDirectoryStart = currentOffset;
    const cdParts: Buffer[] = [];

    for (const entry of fileEntries) {
      const nameBuffer = Buffer.from(entry.name, 'utf8');
      const cdHeader = Buffer.alloc(46);
      cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory header signature
      cdHeader.writeUInt16LE(20, 4);          // Version made by
      cdHeader.writeUInt16LE(20, 6);          // Version needed to extract
      cdHeader.writeUInt16LE(0x0800, 8);      // General purpose bit flag (UTF-8)
      cdHeader.writeUInt16LE(8, 10);          // Compression method (Deflate)
      cdHeader.writeUInt16LE(0, 12);          // Last mod file time
      cdHeader.writeUInt16LE(0x5021, 14);     // Last mod file date
      cdHeader.writeUInt32LE(entry.crc, 16);  // CRC-32
      cdHeader.writeUInt32LE(entry.compressedSize, 20);   // Compressed size
      cdHeader.writeUInt32LE(entry.uncompressedSize, 24); // Uncompressed size
      cdHeader.writeUInt16LE(nameBuffer.length, 28);      // File name length
      cdHeader.writeUInt16LE(0, 30);                      // Extra field length
      cdHeader.writeUInt16LE(0, 32);                      // File comment length
      cdHeader.writeUInt16LE(0, 34);                      // Disk number start
      cdHeader.writeUInt16LE(0, 36);                      // Internal file attributes
      cdHeader.writeUInt32LE(0, 38);                      // External file attributes
      cdHeader.writeUInt32LE(entry.headerOffset, 42);     // Relative offset of local header

      cdParts.push(cdHeader, nameBuffer);
      currentOffset += 46 + nameBuffer.length;
    }

    const centralDirectorySize = currentOffset - centralDirectoryStart;

    // End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);              // EOCD signature
    eocd.writeUInt16LE(0, 4);                       // Number of this disk
    eocd.writeUInt16LE(0, 6);                       // Disk where central directory starts
    eocd.writeUInt16LE(files.length, 8);            // Number of central directory records on this disk
    eocd.writeUInt16LE(files.length, 10);           // Total number of central directory records
    eocd.writeUInt32LE(centralDirectorySize, 12);   // Size of central directory
    eocd.writeUInt32LE(centralDirectoryStart, 16);  // Offset of start of central directory
    eocd.writeUInt16LE(0, 20);                      // Comment length

    return Buffer.concat([...localParts, ...cdParts, eocd]);
  }

  /**
   * Kalkulasi CRC-32 standar IEEE 802.3
   */
  private calculateCrc32(buf: Buffer): number {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const bit = (byte ^ crc) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }
}

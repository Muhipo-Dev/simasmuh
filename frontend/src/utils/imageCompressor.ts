/**
 * Utility untuk kompresi gambar otomatis di sisi klien (browser)
 * Memastikan gambar yang diunggah dan ditayangkan selalu cepat, terkompres dengan baik,
 * serta aman digunakan untuk preview maupun upload ke server.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.75)
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
  maxSizeBytes?: number; // Default 1MB (1024 * 1024)
}

export interface CompressResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

/**
 * Kompres file gambar dari input pengguna (Otomatis dibatasi <= 1MB)
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    outputFormat = 'image/webp',
    maxSizeBytes = 1024 * 1024 // 1MB
  } = options;

  let quality = options.quality ?? 0.8;
  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = async () => {
        let { width, height } = img;
        let currentMaxWidth = maxWidth;
        let currentMaxHeight = maxHeight;

        // Multi-pass compression loop to guarantee <= 1MB
        let blob: Blob | null = null;
        let dataUrl = '';
        let mime = outputFormat;
        let pass = 0;
        const maxPasses = 4;

        while (pass < maxPasses) {
          let targetW = width;
          let targetH = height;

          if (targetW > currentMaxWidth || targetH > currentMaxHeight) {
            const widthRatio = currentMaxWidth / targetW;
            const heightRatio = currentMaxHeight / targetH;
            const bestRatio = Math.min(widthRatio, heightRatio);

            targetW = Math.round(targetW * bestRatio);
            targetH = Math.round(targetH * bestRatio);
          }

          // Gambar ke HTML5 Canvas
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal mendapatkan konteks canvas untuk kompresi gambar.'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);

          let format = outputFormat;
          dataUrl = canvas.toDataURL(format, quality);

          if (format === 'image/webp' && (!dataUrl || !dataUrl.startsWith('data:image/webp'))) {
            format = 'image/jpeg';
            dataUrl = canvas.toDataURL(format, quality);
          }

          const arr = dataUrl.split(',');
          mime = (arr[0].match(/:(.*?);/)?.[1] || format) as any;
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);

          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }

          blob = new Blob([u8arr], { type: mime });

          // Jika sudah <= maxSizeBytes atau sudah pass maksimal, berhenti
          if (blob.size <= maxSizeBytes) {
            break;
          }

          // Kurangi parameter untuk pass berikutnya
          pass++;
          quality = Math.max(0.4, quality * 0.75);
          currentMaxWidth = Math.floor(currentMaxWidth * 0.8);
          currentMaxHeight = Math.floor(currentMaxHeight * 0.8);
        }

        if (!blob) {
          reject(new Error('Gagal mengompres gambar.'));
          return;
        }

        const compressedSizeKb = Math.round(blob.size / 1024);
        const ext = mime === 'image/webp' ? '.webp' : mime === 'image/png' ? '.png' : '.jpg';
        const newFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed' + ext;
        const compressedFile = new File([blob], newFileName, { type: mime });

        resolve({
          dataUrl,
          blob,
          file: compressedFile,
          originalSizeKb,
          compressedSizeKb,
          width,
          height
        });
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat gambar untuk proses kompresi.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar.'));
    };

    reader.readAsDataURL(file);
  });
}

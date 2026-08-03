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
 * Kompres file gambar dari input pengguna
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxWidth = 1080,
    maxHeight = 1080,
    quality = 0.75,
    outputFormat = 'image/webp'
  } = options;

  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Hitung rasio aspek dan dimensi baru
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const bestRatio = Math.min(widthRatio, heightRatio);

          width = Math.round(width * bestRatio);
          height = Math.round(height * bestRatio);
        }

        // Gambar ke HTML5 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal mendapatkan konteks canvas untuk kompresi gambar.'));
          return;
        }

        // Gambar ulang dengan kualitas tinggi
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export ke DataURL terkompres (default WEBP atau JPEG fallback)
        let format = outputFormat;
        let dataUrl = canvas.toDataURL(format, quality);

        // Jika browser tidak mendukung webp, gunakan jpeg
        if (format === 'image/webp' && (!dataUrl || !dataUrl.startsWith('data:image/webp'))) {
          format = 'image/jpeg';
          dataUrl = canvas.toDataURL(format, quality);
        }

        // Konversi DataURL ke Blob & File
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || format;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }

        const blob = new Blob([u8arr], { type: mime });
        const compressedSizeKb = Math.round(blob.size / 1024);

        // Buat nama file terkompres dengan ekstensi yang sesuai
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

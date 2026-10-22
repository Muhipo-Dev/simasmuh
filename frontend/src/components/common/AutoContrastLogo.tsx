'use client'

import React, { useState, useEffect, useRef } from 'react'

interface AutoContrastLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  className?: string
}

/**
 * Komponen AutoContrastLogo:
 * Mendeteksi secara otomatis apakah sebuah gambar/logo dominan berwarna putih / abu-abu terang monokrom.
 * Jika putih/terang pada mode terang (light mode), otomatis diubah menjadi hitam pekat (brightness(0)).
 * Jika dark mode, logo putih tetap tampil warna aslinya (putih).
 * Jika logo berwarna (misal logo Google multiwarna / lambang instansi berwarna), warna asli dipertahankan 100%.
 */
export function AutoContrastLogo({ src, alt, className = '', ...props }: AutoContrastLogoProps) {
  const [isWhiteMonochrome, setIsWhiteMonochrome] = useState<boolean>(false)
  const [hasChecked, setHasChecked] = useState<boolean>(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!src) return

    // Cek nama file atau URL terlebih dahulu untuk deteksi cepat jika file mengandung indikasi white/putih
    const lowerSrc = src.toLowerCase()
    if (lowerSrc.includes('white') || lowerSrc.includes('putih')) {
      setIsWhiteMonochrome(true)
      setHasChecked(true)
    }

    // Gunakan Image offscreen + HTML5 Canvas untuk inspeksi piksel warna
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          setHasChecked(true)
          return
        }

        // Perkecil ukuran sampling ke 32x32 untuk kalkulasi cepat dan ringan (0 lag)
        const sampleSize = 32
        canvas.width = sampleSize
        canvas.height = sampleSize
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data
        let visiblePixelCount = 0
        let totalBrightness = 0
        let totalSaturation = 0

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i]
          const g = imgData[i + 1]
          const b = imgData[i + 2]
          const a = imgData[i + 3]

          // Hanya periksa piksel non-transparan
          if (a > 30) {
            visiblePixelCount++
            // Perceived brightness (luminance standard formula)
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b
            totalBrightness += brightness

            // Hitung saturasi warna (HSV saturation)
            const max = Math.max(r, g, b)
            const min = Math.min(r, g, b)
            const saturation = max === 0 ? 0 : (max - min) / max
            totalSaturation += saturation
          }
        }

        if (visiblePixelCount > 0) {
          const avgBrightness = totalBrightness / visiblePixelCount
          const avgSaturation = totalSaturation / visiblePixelCount

          // Kriteria: Rata-rata kecerahan tinggi (> 195) DAN saturasi rendah (< 0.22)
          // Berarti logo berupa teks/ikon putih atau abu-abu sangat terang (bukan warna-warni seperti Google)
          if (avgBrightness > 195 && avgSaturation < 0.25) {
            setIsWhiteMonochrome(true)
          } else {
            setIsWhiteMonochrome(false)
          }
        }
      } catch (err) {
        // Fallback jika CORS canvas terjadi: periksa apakah nama file mengandung kata white
        if (lowerSrc.includes('white') || lowerSrc.includes('putih')) {
          setIsWhiteMonochrome(true)
        }
      } finally {
        setHasChecked(true)
      }
    }

    img.onerror = () => {
      setHasChecked(true)
    }
  }, [src])

  // Jika terdeteksi logo putih monokrom:
  // - Pada light mode: [filter:brightness(0)] -> otomatis berubah menjadi hitam pekat
  // - Pada dark mode: dark:[filter:none] atau dark:brightness-100 -> tetap putih asli
  const autoContrastFilter = isWhiteMonochrome 
    ? 'brightness-0 contrast-100 dark:brightness-100 dark:invert-0' 
    : ''

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`${className} ${autoContrastFilter} transition-[filter] duration-200`}
      {...props}
    />
  )
}

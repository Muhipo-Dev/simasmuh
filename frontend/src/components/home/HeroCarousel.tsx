'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'

interface HeroCarouselProps {
  schoolName: string
}

export default function HeroCarousel({ schoolName }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Default fallback images if no custom banners are uploaded
  const defaultImages = [
    '/banner.png',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
  ]

  const [images, setImages] = useState<string[]>(defaultImages)

  useEffect(() => {
    // Fetch banner images uploaded by Admin Web from backend
    const fetchBanners = async () => {
      try {
        const res = await fetch(getPublicApiUrl('/upload/carousel'), {
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data && Array.isArray(data.images) && data.images.length > 0) {
            setImages(data.images)
          }
        }
      } catch {
        // Fallback to default images
      }
    }
    fetchBanners()
  }, [])

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000) // auto slide every 5s
    return () => clearInterval(timer)
  }, [images])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="relative w-full min-h-[460px] sm:min-h-[520px] md:h-[600px] flex flex-col justify-center pt-6 pb-16 sm:py-20 overflow-hidden bg-slate-950">
      {/* Background Images */}
      {images.map((src, index) => {
        // Handle external src, upload path from proxy, or local file
        const imageSrc = src.startsWith('/uploads') ? `/api-backend${src}` : src
        return (
          <div
            key={index}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image
              src={imageSrc}
              alt={`Slide ${index + 1}`}
              fill
              unoptimized={true}
              className="object-cover brightness-[0.62]"
              quality={100}
              sizes="100vw"
              priority={index === 0}
            />
          </div>
        )
      })}

      {/* Subtle Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent pointer-events-none z-[1]" />

      {/* Hero Content */}
      <div className="relative z-10 px-5 sm:px-10 lg:px-20 max-w-4xl space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Sekolah Unggulan Muhammadiyah</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight sm:leading-tight tracking-tight drop-shadow-md">
          Selamat Datang di <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200">
            {schoolName}
          </span>
        </h1>
        <p className="text-xs sm:text-base md:text-lg text-blue-100/90 font-semibold max-w-xl drop-shadow-xs leading-relaxed tracking-wide">
          &quot;Cerdas, Mandiri, Berprestasi, Mendunia&quot;
        </p>
      </div>

      {/* Carousel Navigation Arrows (Desktop) */}
      {images.length > 1 && (
        <div className="absolute right-6 lg:right-20 bottom-1/2 translate-y-1/2 hidden md:flex gap-3 z-10">
          <button 
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="w-11 h-11 rounded-full border border-white/40 flex items-center justify-center text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextSlide}
            aria-label="Next Slide"
            className="w-11 h-11 rounded-full border border-white/40 flex items-center justify-center text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

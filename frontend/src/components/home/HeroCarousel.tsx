'use client'

import {
  useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'

interface HeroCarouselProps {
  schoolName: string
  videoProfileUrl?: string
  heroBadgeText?: string
  heroBadgeLocation?: string
  heroSubheading?: string
  heroTitlePrefix?: string
  heroTitleGradient?: string
  heroDescription?: string
  heroCtaText?: string
  heroCtaLink?: string
  heroVideoText?: string
  heroVideoLink?: string
}

export default function HeroCarousel({
  schoolName,
  videoProfileUrl,
  heroBadgeText,
  heroBadgeLocation,
  heroSubheading,
  heroTitlePrefix,
  heroTitleGradient,
  heroDescription,
  heroCtaText,
  heroCtaLink,
  heroVideoText,
  heroVideoLink,
}: HeroCarouselProps) {
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
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55' }
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
    <div className="relative w-full min-h-[580px] sm:min-h-[640px] md:h-[720px] flex flex-col justify-center pt-32 sm:pt-40 md:pt-44 pb-24 sm:pb-32 overflow-hidden bg-slate-950">
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
      <div className="relative z-10 px-5 sm:px-10 lg:px-20 max-w-5xl space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold shadow-xs">
            <GraduationCap className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{heroBadgeText || 'Terakreditasi A • Sekolah Unggul Muhammadiyah'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/60 backdrop-blur-md border border-blue-400/30 text-blue-100 text-xs font-semibold">
            <span>{heroBadgeLocation || 'Ponorogo, Jawa Timur'}</span>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <p className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-widest text-blue-200 drop-shadow-sm">
            {heroSubheading || schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO (MUHIPO)'}
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight drop-shadow-xl">
            {heroTitlePrefix || 'EXCELLENT ISLAMIC'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              {heroTitleGradient || 'WITH CHARACTER'}
            </span>
          </h1>
        </div>

        <p className="text-xs sm:text-base md:text-lg text-slate-200 font-medium max-w-2xl drop-shadow-md leading-relaxed">
          {heroDescription || 'Membentuk generasi unggul yang berakhlak mulia, berwawasan global, mandiri, serta berdaya saing internasional berlandaskan nilai-nilai luhur kepesantrenan dan pendidikan berkemajuan.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={heroCtaLink || '#keunggulan'}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5"
          >
            {heroCtaText || 'Kenapa SMA Muhipo?'}
          </a>
          <a
            href={heroVideoLink || videoProfileUrl || "https://www.youtube.com/@SmaMuhipo"}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
          >
            <span>{heroVideoText || 'Tonton Video Profil'}</span>
          </a>
        </div>
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

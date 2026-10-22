"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef<boolean>(false)
  const startXRef = React.useRef<number>(0)
  const startYRef = React.useRef<number>(0)
  const scrollLeftRef = React.useRef<number>(0)
  const scrollTopRef = React.useRef<number>(0)
  const windowScrollYRef = React.useRef<number>(0)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Hanya tangani klik kiri utama
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    const targetTag = target.tagName.toLowerCase()
    // Jangan drag jika berinteraksi dengan kontrol form atau teks yang bisa diedit
    if (['input', 'button', 'select', 'textarea', 'a'].includes(targetTag) || target.isContentEditable) return

    if (!containerRef.current) return
    isDraggingRef.current = true
    setIsDragging(true)
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    scrollLeftRef.current = containerRef.current.scrollLeft
    scrollTopRef.current = containerRef.current.scrollTop
    windowScrollYRef.current = window.scrollY
  }

  React.useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      e.preventDefault()
      const deltaX = e.clientX - startXRef.current
      const deltaY = e.clientY - startYRef.current

      // Geser tabel secara horizontal
      containerRef.current.scrollLeft = scrollLeftRef.current - deltaX

      // Geser secara vertikal (tabel internal atau window)
      if (containerRef.current.scrollHeight > containerRef.current.clientHeight) {
        containerRef.current.scrollTop = scrollTopRef.current - deltaY
      }
      window.scrollTo({
        top: windowScrollYRef.current - deltaY,
        behavior: 'instant' as ScrollBehavior,
      })
    }

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto touch-pan-x touch-pan-y overscroll-x-contain [-webkit-overflow-scrolling:touch] rounded-xl border border-slate-200/70 dark:border-slate-800/80 shadow-2xs transition-all duration-200 in-[[data-slot=card-content]]:border-0 in-[[data-slot=card-content]]:rounded-none in-[[data-slot=card-content]]:shadow-none",
        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-xs sm:text-sm text-slate-800 dark:text-slate-200 border-collapse select-none", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/95 select-none", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0 divide-y divide-slate-200/60 dark:divide-slate-800/80", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/70 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-8.5 sm:h-9.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-left align-middle font-bold text-[10.5px] sm:text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 align-middle text-xs sm:text-sm font-normal text-slate-800 dark:text-slate-200 border-b border-slate-100/80 dark:border-slate-800/60 transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

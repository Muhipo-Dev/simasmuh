'use client'

import React from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { usePathname } from 'next/navigation'
import { X, LucideIcon } from 'lucide-react'

export interface NavLinkItem {
  name: string
  href: string
  icon: LucideIcon
}

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
  links: NavLinkItem[]
  title?: string
}

export function AppSidebar({
  isOpen,
  onClose,
  links,
  title = 'SIMASMUH',
}: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Frame */}
      <aside
        className={`w-72 bg-slate-950/90 dark:bg-slate-950/95 border-r border-white/10 text-white backdrop-blur-2xl flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border-b border-white/10 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <NextImage
              src="/pic_logo.png"
              alt="Logo"
              width={34}
              height={34}
              className="object-contain rounded-xl bg-white/15 border border-white/20 p-1 backdrop-blur-md"
            />
            <span className="text-white font-black text-xl tracking-wider">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            const isActive =
              pathname === link.href ||
              (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`))

            return (
              <Link key={link.href} href={link.href} onClick={onClose}>
                <div
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold ${
                    isActive
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-400/30 backdrop-blur-md shadow-inner'
                      : 'text-slate-300/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive
                        ? 'text-blue-300'
                        : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{link.name}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </aside>
    </>
  )
}

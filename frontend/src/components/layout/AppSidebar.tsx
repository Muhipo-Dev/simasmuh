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
        className={`w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 bg-gradient-to-r from-blue-700 to-indigo-600 shrink-0">
          <div className="flex items-center gap-2.5">
            <NextImage
              src="/pic_logo.png"
              alt="Logo"
              width={34}
              height={34}
              className="object-contain rounded-md bg-white/10 p-0.5"
            />
            <span className="text-white font-extrabold text-2xl tracking-widest">{title}</span>
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
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {links.map((link) => {
            const Icon = link.icon
            const isActive =
              pathname === link.href ||
              (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`))

            return (
              <Link key={link.href} href={link.href} onClick={onClose}>
                <div
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-sm font-semibold ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500'
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

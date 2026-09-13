'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export function AgendaActionButton() {
  const { data: session } = useSession()

  if (!session?.user) return null

  const userRole = (session.user as any)?.role || ''
  const userSubRole = (session.user as any)?.subRole || ''
  const userSubRole2 = (session.user as any)?.subRole2 || ''
  const userSubRole3 = (session.user as any)?.subRole3 || ''
  const userSubRole4 = (session.user as any)?.subRole4 || ''
  const userSubRole5 = (session.user as any)?.subRole5 || ''

  const allRoles = [userRole, userSubRole, userSubRole2, userSubRole3, userSubRole4, userSubRole5].filter(Boolean)

  const allowedRoles = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_WEB', 'WAKA_HUMAS_SDM', 'HUMAS_SDM', 'KEPALA_SEKOLAH']
  const hasAccess = allRoles.some(role => allowedRoles.includes(role))

  if (!hasAccess) return null

  return (
    <Link
      href="/informasi/pengumuman"
      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
    >
      <Plus className="w-3.5 h-3.5" /> Input Agenda Sistem
    </Link>
  )
}

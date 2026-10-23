'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useMemo } from 'react'
import { getOverrideSession, OverrideSessionData } from '@/lib/override-session'

export interface ActiveUser {
  id: string
  name: string
  email?: string | null
  username?: string | null
  nipNbm?: string | null
  role: string
  isActive?: boolean
  subRole?: string | null
  subRole2?: string | null
  subRole3?: string | null
  subRole4?: string | null
  subRole5?: string | null
  avatarUrl?: string | null
  // Override context
  isOverrideSession: boolean
  overrideMode: 'override' | 'spectator' | null
  isReadOnly: boolean
  overrideByAdminId: string | null
  overrideByAdminName: string | null
  overrideByAdminRole: string | null
  // Original admin info
  originalAdminUser?: {
    id: string
    name: string
    role: string
  } | null
}

/**
 * Hook universal untuk mendapatkan data pengguna aktif yang adaptif terhadap mode override.
 * - Jika mode override aktif: mengembalikan data target user yang dioverride, dengan role, izin, dan context lengkapnya.
 * - Jika mode override tidak aktif: mengembalikan data admin/user yang sedang login dari NextAuth session.
 * - Cookie login NextAuth admin tetap utuh dan tidak pernah tergantikan.
 */
export function useActiveUser() {
  const { data: session, status } = useSession()
  const [overrideData, setOverrideData] = useState<OverrideSessionData | null>(null)

  useEffect(() => {
    // Baca override session dari cookie saat mount
    setOverrideData(getOverrideSession())

    const handleOverrideChange = () => {
      setOverrideData(getOverrideSession())
    }

    window.addEventListener('simasmuh-override-changed', handleOverrideChange)
    return () => {
      window.removeEventListener('simasmuh-override-changed', handleOverrideChange)
    }
  }, [])

  const activeUser = useMemo<ActiveUser | null>(() => {
    const adminUser = session?.user as any
    if (overrideData?.user && overrideData?.access_token) {
      const u = overrideData.user
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        nipNbm: u.nipNbm,
        role: u.role,
        isActive: u.isActive !== false,
        subRole: u.subRole,
        subRole2: u.subRole2,
        subRole3: u.subRole3,
        subRole4: u.subRole4,
        subRole5: u.subRole5,
        avatarUrl: u.avatarUrl,
        isOverrideSession: true,
        overrideMode: overrideData.mode || 'override',
        isReadOnly: overrideData.isReadOnly === true || overrideData.mode === 'spectator',
        overrideByAdminId: u.overrideByAdminId || adminUser?.id || null,
        overrideByAdminName: u.overrideByAdminName || adminUser?.name || 'Administrator',
        overrideByAdminRole: u.overrideByAdminRole || adminUser?.role || 'SUPERADMIN',
        originalAdminUser: adminUser
          ? {
              id: adminUser.id,
              name: adminUser.name,
              role: adminUser.role,
            }
          : null,
      }
    }

    if (adminUser) {
      return {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        username: adminUser.username,
        nipNbm: adminUser.nipNbm,
        role: adminUser.role,
        isActive: adminUser.isActive !== false,
        subRole: adminUser.subRole,
        subRole2: adminUser.subRole2,
        subRole3: adminUser.subRole3,
        subRole4: adminUser.subRole4,
        subRole5: adminUser.subRole5,
        avatarUrl: adminUser.avatarUrl,
        isOverrideSession: false,
        overrideMode: null,
        isReadOnly: false,
        overrideByAdminId: null,
        overrideByAdminName: null,
        overrideByAdminRole: null,
        originalAdminUser: null,
      }
    }

    return null
  }, [session, overrideData])

  return {
    user: activeUser,
    status,
    isOverride: Boolean(activeUser?.isOverrideSession),
    overrideData,
    adminSession: session,
  }
}

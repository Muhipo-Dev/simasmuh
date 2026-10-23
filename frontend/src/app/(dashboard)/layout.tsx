import { DashboardClientShell } from '@/components/layout/DashboardClientShell'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardClientShell>{children}</DashboardClientShell>
}

'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Construction, Sparkles, BookOpen } from 'lucide-react'

interface KurikulumPlaceholderProps {
  name: string
  code: string
  description: string
}

export function KurikulumPlaceholderWorkspace({ name, code, description }: KurikulumPlaceholderProps) {
  return (
    <Card className="border-dashed border-border/80">
      <CardContent className="py-12 px-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
          <Construction className="h-8 w-8" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-foreground">{name}</h3>
          <Badge variant="outline" className="font-mono text-xs">
            {code}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-xs text-muted-foreground w-full text-left space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Arsitektur Path Modular SIMASMUH:
          </div>
          <p>
            Subfolder kurikulum telah disiapkan di <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">frontend/src/components/academic/kurikulum/k13/</code> dan <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">backend/src/modules/academic/kurikulum/k13/</code>.
          </p>
          <p>
            Ketika kurikulum ini diaktifkan oleh sekolah, modul administrasi siap memuat form KI/KD dan RPP tanpa mengganggu Kurikulum Merdeka yang sedang aktif.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

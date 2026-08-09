import React from 'react'
import ErrorPageContainer from '@/components/ui/ErrorPageContainer'

interface DynamicErrorPageProps {
  params: Promise<{ code: string }>
}

export default async function DynamicErrorPage({ params }: DynamicErrorPageProps) {
  const resolvedParams = await params
  const statusCode = parseInt(resolvedParams.code, 10) || 404

  return <ErrorPageContainer code={statusCode} />
}

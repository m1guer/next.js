import { Suspense } from 'react'
import SharedComponent from '../shared'

export default async function FirstLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<Record<string, string>>
}) {
  const current = await params

  return (
    <>
      <pre>{JSON.stringify(current)}</pre>
      <SharedComponent layout={`/[first]`} />
      <Suspense>{children}</Suspense>
    </>
  )
}

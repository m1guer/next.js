import crypto from 'node:crypto'
import { Suspense } from 'react'

export default async function Page() {
  return (
    <>
      <p>
        This page uses Node's `crypto.randomInt(x, y)` in a Server Component
        which is an error unless preceded by something else dynamic
      </p>
      <Suspense fallback="loading...">
        <SyncIOComponent />
      </Suspense>
    </>
  )
}

async function SyncIOComponent() {
  await new Promise((r) => process.nextTick(r))
  const first = crypto.randomInt(128, 256)
  return <div>{first}</div>
}

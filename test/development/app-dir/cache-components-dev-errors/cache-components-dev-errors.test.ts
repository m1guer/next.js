import stripAnsi from 'strip-ansi'
import { nextTestSetup } from 'e2e-utils'
import {
  assertNoRedbox,
  assertNoErrorToast,
  hasErrorToast,
  retry,
} from 'next-test-utils'
import { createSandbox } from 'development-sandbox'
import { outdent } from 'outdent'

describe('Cache Components Dev Errors', () => {
  const { isTurbopack, next } = nextTestSetup({
    files: __dirname,
  })

  it('should show a red box error on the SSR render', async () => {
    const browser = await next.browser('/error')

    // TODO(veil): The "Page <anonymous>" frame should be omitted.
    // Interestingly, it only appears on initial load, and not when
    // soft-navigating to the page (see test below).
    await expect(browser).toDisplayCollapsedRedbox(`
     {
       "description": "Route "/error" used \`Math.random()\` before accessing either uncached data (e.g. \`fetch()\`) or Request data (e.g. \`cookies()\`, \`headers()\`, \`connection()\`, and \`searchParams\`). Accessing random values synchronously in a Server Component requires reading one of these data sources first. Alternatively, consider moving this expression into a Client Component or Cache Component. See more info here: https://nextjs.org/docs/messages/next-prerender-random",
       "environmentLabel": "Server",
       "label": "Console Error",
       "source": "app/error/page.tsx (2:23) @ Page
     > 2 |   const random = Math.random()
         |                       ^",
       "stack": [
         "Page app/error/page.tsx (2:23)",
         "Page <anonymous>",
         "LogSafely <anonymous>",
       ],
     }
    `)
  })

  it('should not show a red box error on client navigations', async () => {
    const browser = await next.browser('/no-error')

    await retry(async () => {
      expect(await hasErrorToast(browser)).toBe(false)
    })

    await browser.elementByCss("[href='/error']").click()
    await assertNoErrorToast(browser)

    await browser.loadPage(`${next.url}/error`)

    // TODO: React should not include the anon stack in the Owner Stack.
    await expect(browser).toDisplayCollapsedRedbox(`
     {
       "description": "Route "/error" used \`Math.random()\` before accessing either uncached data (e.g. \`fetch()\`) or Request data (e.g. \`cookies()\`, \`headers()\`, \`connection()\`, and \`searchParams\`). Accessing random values synchronously in a Server Component requires reading one of these data sources first. Alternatively, consider moving this expression into a Client Component or Cache Component. See more info here: https://nextjs.org/docs/messages/next-prerender-random",
       "environmentLabel": "Server",
       "label": "Console Error",
       "source": "app/error/page.tsx (2:23) @ Page
     > 2 |   const random = Math.random()
         |                       ^",
       "stack": [
         "Page app/error/page.tsx (2:23)",
         "Page <anonymous>",
         "LogSafely <anonymous>",
       ],
     }
    `)
  })

  it('should not log unhandled rejections for persistently thrown top-level errors', async () => {
    const cliOutputLength = next.cliOutput.length
    const res = await next.fetch('/top-level-error')
    expect(res.status).toBe(500)

    await retry(() => {
      const cliOutput = stripAnsi(next.cliOutput.slice(cliOutputLength))
      expect(cliOutput).toContain('GET /top-level-error 500')
    })

    expect(next.cliOutput.slice(cliOutputLength)).not.toContain(
      'unhandledRejection'
    )
  })

  // NOTE: when update this snapshot, use `pnpm build` in packages/next to avoid next source code get mapped to source.
  it('should display error when component accessed data without suspense boundary', async () => {
    const outputIndex = next.cliOutput.length
    const browser = await next.browser('/no-accessed-data')

    await retry(() => {
      expect(next.cliOutput.slice(outputIndex)).toContain(
        'Error: Route "/no-accessed-data"'
      )
    })

    expect(stripAnsi(next.cliOutput.slice(outputIndex))).toContain(
      'https://nextjs.org/docs/messages/blocking-route'
    )

    await expect(browser).toDisplayCollapsedRedbox(`
     {
       "description": "Uncached data was accessed outside of <Suspense>

     This delays the entire page from rendering, resulting in a slow user experience. Next.js uses this error to ensure your app loads instantly on every navigation.

     To fix this, you can either:

     Wrap the component in a <Suspense> boundary. This allows Next.js to stream its contents to the user as soon as it's ready, without blocking the rest of the app.

     or

     Move the asynchronous await into a Cache Component ("use cache"). This allows Next.js to statically prerender the component as part of the HTML document, so it's instantly visible to the user.

     Note that request-specific information — such as params, cookies, and headers — is not available during static prerendering, so must be wrapped in <Suspense>.

     Learn more: https://nextjs.org/docs/messages/blocking-route",
       "environmentLabel": "Server",
       "label": "Blocking Route",
       "source": "app/no-accessed-data/page.js (1:31) @ Page
     > 1 | export default async function Page() {
         |                               ^",
       "stack": [
         "Page app/no-accessed-data/page.js (1:31)",
         "LogSafely <anonymous>",
       ],
     }
    `)
  })

  it('should clear segment errors after correcting them', async () => {
    await using sandbox = await createSandbox(
      next,
      new Map([
        [
          'app/page.tsx',
          outdent`
          export const revalidate = 10
          export default function Page() {
            return (
              <div>Hello World</div>
            );
          }
        `,
        ],
      ])
    )
    const { browser, session } = sandbox
    if (isTurbopack) {
      await expect(browser).toDisplayRedbox(`
       {
         "description": "Ecmascript file had an error",
         "environmentLabel": null,
         "label": "Build Error",
         "source": "./app/page.tsx (1:14)
       Ecmascript file had an error
       > 1 | export const revalidate = 10
           |              ^^^^^^^^^^",
         "stack": [],
       }
      `)
    } else {
      await expect(browser).toDisplayRedbox(`
       {
         "description": "  x Route segment config "revalidate" is not compatible with \`nextConfig.cacheComponents\`. Please remove it.",
         "environmentLabel": null,
         "label": "Build Error",
         "source": "./app/page.tsx
       Error:   x Route segment config "revalidate" is not compatible with \`nextConfig.cacheComponents\`. Please remove it.
          ,-[1:1]
        1 | export const revalidate = 10
          :              ^^^^^^^^^^
        2 | export default function Page() {
        3 |   return (
        4 |     <div>Hello World</div>
          \`----",
         "stack": [],
       }
      `)
    }

    await session.patch(
      'app/page.tsx',
      outdent`
      export default function Page() {
        return (
          <div>Hello World</div>
        );
      }
    `
    )

    await assertNoRedbox(browser)
  })
})

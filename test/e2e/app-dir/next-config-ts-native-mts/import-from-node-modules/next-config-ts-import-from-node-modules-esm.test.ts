import { nextTestSetup } from 'e2e-utils'

describe('next-config-ts-import-from-node-modules-esm', () => {
  // TODO: Remove this once we bump minimum Node.js version to v22
  if (!(process.features as any).typescript) {
    it.skip('requires `process.features.typescript` to feature detect Node.js native TS', () => {})
    return
  }

  const { next } = nextTestSetup({
    files: __dirname,
    packageJson: {
      type: 'module',
    },
  })

  it('should import from node_modules (ESM)', async () => {
    const $ = await next.render$('/')
    const text = $('p').text()
    expect(text).toContain('cjs')
    expect(text).toContain('mjs')
    expect(text).toContain('jsCJS')
    expect(text).toContain('jsESM')
  })
})

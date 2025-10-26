import {
  decodeMagicIdentifier,
  MAGIC_IDENTIFIER_REGEX,
  deobfuscateModuleId,
  removeFreeCallWrapper,
  deobfuscateText,
  deobfuscateTextParts,
} from './magic-identifier'

describe('decodeMagicIdentifier', () => {
  // Basic decoding tests (ported from Rust)
  test('decodes module evaluation', () => {
    expect(decodeMagicIdentifier('__TURBOPACK__module__evaluation__')).toBe(
      'module evaluation'
    )
  })

  test('decodes path with slashes', () => {
    expect(decodeMagicIdentifier('__TURBOPACK__Hello$2f$World__')).toBe(
      'Hello/World'
    )
  })

  test('decodes emoji', () => {
    expect(decodeMagicIdentifier('__TURBOPACK__Hello$_1f600$World__')).toBe(
      'Hello😀World'
    )
  })

  test('returns unchanged if not a magic identifier', () => {
    expect(decodeMagicIdentifier('regular_identifier')).toBe(
      'regular_identifier'
    )
  })
})

describe('MAGIC_IDENTIFIER_REGEX', () => {
  test('matches magic identifiers globally', () => {
    const text =
      'Hello __TURBOPACK__Hello__World__ and __TURBOPACK__foo$2f$bar__'
    const matches = text.match(MAGIC_IDENTIFIER_REGEX)
    expect(matches).toHaveLength(2)
  })
})

describe('deobfuscateModuleId', () => {
  test('replaces [project] with .', () => {
    expect(
      deobfuscateModuleId('[project]/examples/with-turbopack/app/foo.ts')
    ).toBe('./examples/with-turbopack/app/foo.ts')
  })

  test('removes content in square brackets', () => {
    expect(
      deobfuscateModuleId('./examples/with-turbopack/app/foo.ts [app-rsc]')
    ).toBe('./examples/with-turbopack/app/foo.ts')
  })

  test('removes content in parentheses', () => {
    expect(
      deobfuscateModuleId('./examples/with-turbopack/app/foo.ts (ecmascript)')
    ).toBe('./examples/with-turbopack/app/foo.ts')
  })

  test('removes content in angle brackets', () => {
    expect(
      deobfuscateModuleId('./examples/with-turbopack/app/foo.ts <locals>')
    ).toBe('./examples/with-turbopack/app/foo.ts')
  })

  test('handles combined cleanup', () => {
    expect(
      deobfuscateModuleId(
        '[project]/examples/with-turbopack/app/foo.ts [app-rsc] (ecmascript)'
      )
    ).toBe('./examples/with-turbopack/app/foo.ts')
  })

  test('handles parenthesis in path', () => {
    expect(
      deobfuscateModuleId(
        '[project]/examples/(group)/with-turbopack/app/foo.ts [app-rsc] (ecmascript)'
      )
    ).toBe('./examples/(group)/with-turbopack/app/foo.ts')
  })
})

describe('removeFreeCallWrapper', () => {
  test('removes (0, ) wrapper', () => {
    expect(removeFreeCallWrapper('(0, __TURBOPACK__foo__.bar)')).toBe(
      '__TURBOPACK__foo__.bar'
    )
  })

  test('removes (0 , ) wrapper with spaces', () => {
    expect(removeFreeCallWrapper('(0 , __TURBOPACK__foo__.bar)')).toBe(
      '__TURBOPACK__foo__.bar'
    )
  })

  test('leaves non-free-call expressions unchanged', () => {
    expect(removeFreeCallWrapper('(foo, bar)')).toBe('(foo, bar)')
    expect(removeFreeCallWrapper('foo()')).toBe('foo()')
  })
})

describe('deobfuscateText', () => {
  test('deobfuscates complete error message with imported module', () => {
    const input =
      '(0 , __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$with$2d$turbopack$2f$app$2f$foo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__.foo) is not a function'
    const output = deobfuscateText(input)
    expect(output).toBe(
      '{imported module ./examples/with-turbopack/app/foo.ts}.foo is not a function'
    )
  })

  test('handles multiple magic identifiers', () => {
    const input =
      '__TURBOPACK__module__evaluation__ called __TURBOPACK__foo$2f$bar__'
    const output = deobfuscateText(input)
    expect(output).toBe('{module evaluation} called {foo/bar}')
  })

  test('leaves regular text unchanged', () => {
    const input = 'This is a regular error message'
    expect(deobfuscateText(input)).toBe(input)
  })
})

describe('deobfuscateTextParts', () => {
  test('returns discriminated parts with raw and deobfuscated text', () => {
    const input = 'Error in __TURBOPACK__module__evaluation__ at line 10'
    const output = deobfuscateTextParts(input)
    expect(output).toEqual([
      ['raw', 'Error in '],
      ['deobfuscated', '{module evaluation}'],
      ['raw', ' at line 10'],
    ])
  })

  test('handles multiple magic identifiers with interleaved raw text', () => {
    const input =
      '__TURBOPACK__module__evaluation__ called __TURBOPACK__foo$2f$bar__'
    const output = deobfuscateTextParts(input)
    expect(output).toEqual([
      ['deobfuscated', '{module evaluation}'],
      ['raw', ' called '],
      ['deobfuscated', '{foo/bar}'],
    ])
  })

  test('returns single raw part for text without magic identifiers', () => {
    const input = 'This is a regular error message'
    const output = deobfuscateTextParts(input)
    expect(output).toEqual([['raw', 'This is a regular error message']])
  })

  test('handles imported module with free call wrapper', () => {
    const input =
      '(0 , __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$with$2d$turbopack$2f$app$2f$foo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__.foo) is not a function'
    const output = deobfuscateTextParts(input)
    expect(output).toEqual([
      [
        'deobfuscated',
        '{imported module ./examples/with-turbopack/app/foo.ts}',
      ],
      ['raw', '.foo is not a function'],
    ])
  })

  test('produces same result as deobfuscateText when joined', () => {
    const input =
      'Error in __TURBOPACK__module__evaluation__ at __TURBOPACK__foo$2f$bar__'
    const parts = deobfuscateTextParts(input)
    const joined = parts.map((part) => part[1]).join('')
    expect(joined).toBe(deobfuscateText(input))
  })
})

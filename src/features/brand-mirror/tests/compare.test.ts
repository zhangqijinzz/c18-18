import { describe, expect, it } from 'vitest'
import { diffTokens, formatTokenValue } from '../domain/brandRules'
import { INITIAL_TOKENS } from '../models/brandMirrorModels'
import { buildBrandGuidelinesMarkdown } from '../services/exportService'
import type { BrandMirrorSnapshot, SavedVersion } from '../models/brandMirrorModels'

function snapshotWith(versions: SavedVersion[]): BrandMirrorSnapshot {
  return {
    status: 'ready',
    tokens: versions[versions.length - 1].tokens,
    theme: 'studio',
    versions,
    compareMode: true,
    activeVersionId: versions[1]?.id ?? versions[0]?.id ?? null,
    contrastRatio: 4.2,
    contrastWarning: false,
    message: '',
  }
}

function groupOf(diff: ReturnType<typeof diffTokens>, key: string) {
  const group = diff.groups.find((item) => item.key === key)
  if (!group) throw new Error(`missing group ${key}`)
  return group
}

describe('diffTokens', () => {
  it('flags modified colors, radii, spacing and type levels with before/after values', () => {
    const before = { ...INITIAL_TOKENS, radiusScale: [...INITIAL_TOKENS.radiusScale], spacingScale: [...INITIAL_TOKENS.spacingScale], typeScale: [...INITIAL_TOKENS.typeScale] }
    const after: typeof before = {
      ...before,
      primary: '#238B73',
      radiusScale: [4, 8, 12, 18],
      spacingScale: [4, 8, 16, 24, 40],
      typeScale: [12, 14, 16, 22, 30, 44],
    }
    const diff = diffTokens(before, after)
    expect(diff.changeCount).toBe(11)
    const color = groupOf(diff, 'color')
    expect(color.rows[0]).toMatchObject({ key: 'primary', kind: 'modified', before: '#F15A47', after: '#238B73' })
    const radius = groupOf(diff, 'radiusScale')
    expect(radius.rows.map((row) => [row.index, row.before, row.after])).toEqual([
      [0, '8px', '4px'], [1, '12px', '8px'], [2, '18px', '12px'], [3, '28px', '18px'],
    ])
  })

  it('aligns scales by position when the two versions have different level counts', () => {
    const before = { ...INITIAL_TOKENS, radiusScale: [...INITIAL_TOKENS.radiusScale], spacingScale: [...INITIAL_TOKENS.spacingScale], typeScale: [...INITIAL_TOKENS.typeScale] }
    const after = { ...before, spacingScale: [8, 16, 24], typeScale: [12, 14, 16, 20, 28, 40, 56] }
    const diff = diffTokens(before, after)
    const spacing = groupOf(diff, 'spacingScale')
    expect(spacing.beforeLevelCount).toBe(5)
    expect(spacing.afterLevelCount).toBe(3)
    expect(spacing.rows.filter((row) => row.kind === 'removed').map((row) => row.index)).toEqual([3, 4])
    const type = groupOf(diff, 'typeScale')
    const added = type.rows.find((row) => row.kind === 'added')
    expect(added).toMatchObject({ index: 6, before: null, after: '56px' })
  })

  it('reports zero changes for identical tokens', () => {
    const copy = { ...INITIAL_TOKENS, radiusScale: [...INITIAL_TOKENS.radiusScale], spacingScale: [...INITIAL_TOKENS.spacingScale], typeScale: [...INITIAL_TOKENS.typeScale] }
    const diff = diffTokens(INITIAL_TOKENS, copy)
    expect(diff.changeCount).toBe(0)
    expect(diff.groups.every((group) => group.rows.length === 0)).toBe(true)
  })

  it('formats colors without units and scales with px', () => {
    expect(formatTokenValue('primary', '#123456')).toBe('#123456')
    expect(formatTokenValue('radiusScale', 18)).toBe('18px')
  })

  it('drives both the UI counts and the exported document so conclusions stay consistent', () => {
    const versionA: SavedVersion = { id: 'a', label: 'Version A', createdAt: '2026-09-01T00:00:00.000Z', tokens: { ...INITIAL_TOKENS, radiusScale: [...INITIAL_TOKENS.radiusScale], spacingScale: [...INITIAL_TOKENS.spacingScale], typeScale: [...INITIAL_TOKENS.typeScale] } }
    const versionB: SavedVersion = {
      id: 'b', label: 'Version B', createdAt: '2026-09-02T00:00:00.000Z',
      tokens: { primary: '#238B73', secondary: '#173C35', radiusScale: [4, 8, 12, 18], spacingScale: [4, 8, 16, 24], typeScale: [12, 14, 16, 22, 30, 44] },
    }
    const diff = diffTokens(versionA.tokens, versionB.tokens)
    const markdown = buildBrandGuidelinesMarkdown(snapshotWith([versionA, versionB]))
    expect(markdown).toContain('## 版本对比')
    expect(markdown).toContain(`变化条数：**${diff.changeCount} 项**`)
    expect(markdown).toContain('`spacing.5`')
    expect(markdown).toContain('该版本缺少此层级')
  })
})

import { describe, expect, it } from 'vitest'
import type { BrandTokens, SavedVersion } from '../models/brandMirrorModels'
import { INITIAL_TOKENS } from '../models/brandMirrorModels'
import { buildVersionDiff, diffFromVersions, getLatestTwo } from '../versioning/versionDiff'
import { buildBrandGuidelinesMarkdown } from '../services/exportService'

function version(label: string, tokens: BrandTokens, createdAt = '2026-10-01T00:00:00.000Z'): SavedVersion {
  return { id: label.toLowerCase(), label, tokens: { ...tokens, radiusScale: [...tokens.radiusScale], spacingScale: [...tokens.spacingScale], typeScale: [...tokens.typeScale] }, createdAt }
}

function snapshotOf(versions: SavedVersion[], tokens: BrandTokens = versions[versions.length - 1]?.tokens ?? INITIAL_TOKENS) {
  return { status: 'ready' as const, tokens, theme: 'studio' as const, versions, compareMode: false, activeVersionId: null, contrastRatio: 4.5, contrastWarning: false, message: '' }
}

describe('version diff', () => {
  it('reports no changes when the two versions share identical tokens', () => {
    const diff = buildVersionDiff([version('Version A', INITIAL_TOKENS), version('Version B', INITIAL_TOKENS)])
    expect(diff.changeCount).toBe(0)
    expect(diff.rows.every((row) => row.status === 'same')).toBe(true)
  })

  it('flags changed colors with before and after values', () => {
    const diff = buildVersionDiff([
      version('Version A', INITIAL_TOKENS),
      version('Version B', { ...INITIAL_TOKENS, primary: '#238B73' }),
    ])
    const primary = diff.rows.find((row) => row.token === 'primary')
    expect(primary?.status).toBe('changed')
    expect(primary?.before).toBe('#F15A47')
    expect(primary?.after).toBe('#238B73')
    expect(diff.changeCount).toBe(1)
  })

  it('compares colors case-insensitively', () => {
    const diff = buildVersionDiff([
      version('Version A', { ...INITIAL_TOKENS, primary: '#f15a47' }),
      version('Version B', { ...INITIAL_TOKENS, primary: '#F15A47' }),
    ])
    expect(diff.rows.find((row) => row.token === 'primary')?.status).toBe('same')
  })

  it('marks every radius, spacing and type level as its own change', () => {
    const diff = buildVersionDiff([
      version('Version A', INITIAL_TOKENS),
      version('Version B', {
        ...INITIAL_TOKENS,
        radiusScale: [4, 12, 18, 28],
        spacingScale: [4, 8, 16, 20, 32],
        typeScale: [12, 14, 16, 22, 28, 44],
      }),
    ])
    expect(diff.groups.find((group) => group.key === 'radius')?.changeCount).toBe(1)
    expect(diff.groups.find((group) => group.key === 'spacing')?.changeCount).toBe(1)
    expect(diff.groups.find((group) => group.key === 'type')?.changeCount).toBe(2)
    expect(diff.changeCount).toBe(4)
  })

  it('aligns levels by position and marks missing levels as removed instead of shifting rows', () => {
    const shorterRadius: BrandTokens = { ...INITIAL_TOKENS, radiusScale: [8, 12, 18] }
    const diff = buildVersionDiff([version('Version A', INITIAL_TOKENS), version('Version B', shorterRadius)])
    const radiusRows = diff.rows.filter((row) => row.group === 'radius')
    expect(radiusRows.map((row) => row.token)).toEqual(['radius.1', 'radius.2', 'radius.3', 'radius.4'])
    expect(radiusRows[0]).toMatchObject({ before: '8', after: '8', status: 'same' })
    expect(radiusRows[3]).toMatchObject({ before: '28', after: null, status: 'removed' })
  })

  it('marks extra levels as added', () => {
    const longerType: BrandTokens = { ...INITIAL_TOKENS, typeScale: [12, 14, 16, 20, 28, 40, 52] }
    const diff = buildVersionDiff([version('Version A', INITIAL_TOKENS), version('Version B', longerType)])
    const added = diff.rows.find((row) => row.token === 'type.7')
    expect(added).toMatchObject({ before: null, after: '52', status: 'added' })
    expect(diff.changeCount).toBe(1)
  })

  it('always diffs the latest two saved versions', () => {
    const versions = [
      version('Version A', INITIAL_TOKENS),
      version('Version B', { ...INITIAL_TOKENS, primary: '#238B73' }),
      version('Version C', { ...INITIAL_TOKENS, primary: '#A98BFF' }),
    ]
    const pair = getLatestTwo(versions)
    expect(pair?.map((item) => item.label)).toEqual(['Version B', 'Version C'])
    expect(diffFromVersions(versions.slice(0, 1))).toBeNull()
  })

  it('keeps the exported guidelines consistent with the on-screen diff', () => {
    const versions = [
      version('Version A', INITIAL_TOKENS),
      version('Version B', { ...INITIAL_TOKENS, primary: '#238B73', radiusScale: [4, 12, 18, 28] }),
    ]
    const diff = diffFromVersions(versions)
    if (!diff) throw new Error('expected a diff for two versions')
    const markdown = buildBrandGuidelinesMarkdown(snapshotOf(versions))
    expect(markdown).toContain('## 版本对比')
    expect(markdown).toContain(`共 ${diff.changeCount} 项变化`)
    expect(markdown).toContain('Version A → Version B')
    expect(markdown).toContain('颜色 1 项')
    expect(markdown).toContain('圆角 1 项')
    expect(markdown).toContain('间距 0 项')
    expect(markdown).toContain('#F15A47')
    expect(markdown).toContain('#238B73')
  })

  it('prompts to save versions in the export when fewer than two exist', () => {
    const markdown = buildBrandGuidelinesMarkdown(snapshotOf([]))
    expect(markdown).toContain('保存两个版本后')
  })
})

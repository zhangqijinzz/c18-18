import type { BrandTokens, SavedVersion } from '../models/brandMirrorModels'

export type DiffStatus = 'same' | 'changed' | 'added' | 'removed'
export type DiffGroupKey = 'color' | 'radius' | 'spacing' | 'type'
export type DiffValueKind = 'color' | 'scale'

export interface DiffRow {
  key: string
  group: DiffGroupKey
  /** 行内展示名，例如「主色」「圆角 2」 */
  label: string
  /** 令牌名，例如 `primary`、`radius.2` */
  token: string
  kind: DiffValueKind
  before: string | null
  after: string | null
  status: DiffStatus
}

export interface DiffGroup {
  key: DiffGroupKey
  label: string
  rows: DiffRow[]
  changeCount: number
}

export interface VersionDiff {
  before: SavedVersion
  after: SavedVersion
  groups: DiffGroup[]
  rows: DiffRow[]
  changeCount: number
}

export interface DiffGroupMeta {
  key: DiffGroupKey
  label: string
  /** 尺度类令牌前缀，颜色组为空 */
  tokenPrefix: 'radius' | 'spacing' | 'type' | ''
  kind: DiffValueKind
}

export const DIFF_GROUPS: DiffGroupMeta[] = [
  { key: 'color', label: '颜色', tokenPrefix: '', kind: 'color' },
  { key: 'radius', label: '圆角', tokenPrefix: 'radius', kind: 'scale' },
  { key: 'spacing', label: '间距', tokenPrefix: 'spacing', kind: 'scale' },
  { key: 'type', label: '字号', tokenPrefix: 'type', kind: 'scale' },
]

export const DIFF_STATUS_LABEL: Record<DiffStatus, string> = {
  same: '一致',
  changed: '变更',
  added: '新增',
  removed: '移除',
}

/** 对比固定取最近保存的两个版本，UI 与导出共用这一入口，避免结论分叉 */
export function getLatestTwo(versions: SavedVersion[]): [SavedVersion, SavedVersion] | null {
  if (versions.length < 2) return null
  return [versions[versions.length - 2], versions[versions.length - 1]]
}

function resolveStatus(before: string | null, after: string | null): DiffStatus {
  if (before === null && after !== null) return 'added'
  if (before !== null && after === null) return 'removed'
  if (before !== after) return 'changed'
  return 'same'
}

function scaleField(group: DiffGroupMeta): keyof Pick<BrandTokens, 'radiusScale' | 'spacingScale' | 'typeScale'> {
  return `${group.tokenPrefix}Scale` as 'radiusScale' | 'spacingScale' | 'typeScale'
}

function buildRows(group: DiffGroupMeta, beforeTokens: BrandTokens, afterTokens: BrandTokens): DiffRow[] {
  if (group.kind === 'color') {
    const colors: { field: 'primary' | 'secondary'; label: string }[] = [
      { field: 'primary', label: '主色' },
      { field: 'secondary', label: '辅助色' },
    ]
    return colors.map(({ field, label }) => {
      const before = beforeTokens[field]?.toUpperCase() ?? null
      const after = afterTokens[field]?.toUpperCase() ?? null
      return { key: field, group: group.key, label, token: field, kind: 'color', before, after, status: resolveStatus(before, after) }
    })
  }

  const beforeValues = beforeTokens[scaleField(group)]
  const afterValues = afterTokens[scaleField(group)]
  // 层级数量不一致时按位置（索引）对齐：多出的层级记为新增/移除，其余层级不会错位
  const length = Math.max(beforeValues.length, afterValues.length)
  return Array.from({ length }, (_, index) => {
    const before = beforeValues[index]?.toString() ?? null
    const after = afterValues[index]?.toString() ?? null
    const ordinal = index + 1
    return {
      key: `${group.tokenPrefix}.${ordinal}`,
      group: group.key,
      label: `${group.label} ${ordinal}`,
      token: `${group.tokenPrefix}.${ordinal}`,
      kind: 'scale',
      before,
      after,
      status: resolveStatus(before, after),
    }
  })
}

export function buildVersionDiff(pair: [SavedVersion, SavedVersion]): VersionDiff {
  const [before, after] = pair
  const groups: DiffGroup[] = DIFF_GROUPS.map((group) => {
    const rows = buildRows(group, before.tokens, after.tokens)
    return { key: group.key, label: group.label, rows, changeCount: rows.filter((row) => row.status !== 'same').length }
  })
  const rows = groups.flatMap((group) => group.rows)
  return { before, after, groups, rows, changeCount: rows.filter((row) => row.status !== 'same').length }
}

export function diffFromVersions(versions: SavedVersion[]): VersionDiff | null {
  const pair = getLatestTwo(versions)
  return pair ? buildVersionDiff(pair) : null
}

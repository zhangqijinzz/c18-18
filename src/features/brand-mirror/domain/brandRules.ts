import type { BrandTheme, BrandTokens } from '../models/brandMirrorModels'
import { INITIAL_TOKENS, THEME_PRESETS } from '../models/brandMirrorModels'

const HEX_COLOR = /^#[0-9A-F]{6}$/i

export function cloneTokens(tokens: BrandTokens): BrandTokens {
  return { ...tokens, radiusScale: [...tokens.radiusScale], spacingScale: [...tokens.spacingScale], typeScale: [...tokens.typeScale] }
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value)
}

export function normalizeColor(value: string): string {
  const candidate = value.trim().toUpperCase()
  return isHexColor(candidate) ? candidate : INITIAL_TOKENS.primary
}

export function clampTokenValues(tokens: BrandTokens): BrandTokens {
  return {
    ...cloneTokens(tokens),
    radiusScale: tokens.radiusScale.map((value) => Math.min(40, Math.max(0, Math.round(value)))),
    spacingScale: tokens.spacingScale.map((value) => Math.min(64, Math.max(2, Math.round(value)))),
    typeScale: tokens.typeScale.map((value) => Math.min(72, Math.max(10, Math.round(value)))),
  }
}

export function validateTokens(tokens: BrandTokens): string | null {
  if (!isHexColor(tokens.primary) || !isHexColor(tokens.secondary)) return '请输入 6 位 HEX 颜色'
  if (tokens.radiusScale.length !== 4 || tokens.spacingScale.length !== 5 || tokens.typeScale.length !== 6) return '令牌层级数量不完整'
  if (tokens.typeScale.some((value) => value < 10 || value > 72)) return '字号范围应在 10–72px'
  return null
}

function channel(value: number): number {
  const scaled = value / 255
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

function luminance(color: string): number {
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

export function contrastRatio(first: string, second: string): number {
  const one = luminance(first)
  const two = luminance(second)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

export function themeTokens(theme: BrandTheme): BrandTokens {
  return cloneTokens(THEME_PRESETS[theme].tokens)
}

export type TokenScaleKey = 'radiusScale' | 'spacingScale' | 'typeScale'
export type TokenField = 'primary' | 'secondary' | TokenScaleKey
export type DiffGroupKey = 'color' | TokenScaleKey
export type TokenChangeKind = 'modified' | 'added' | 'removed'

export interface TokenChange {
  key: TokenField
  label: string
  tokenName: string
  index: number | null
  kind: TokenChangeKind
  before: string | null
  after: string | null
}

export interface TokenGroupDiff {
  key: DiffGroupKey
  label: string
  rows: TokenChange[]
  changeCount: number
  beforeLevelCount: number | null
  afterLevelCount: number | null
}

export interface TokenDiff {
  groups: TokenGroupDiff[]
  changeCount: number
}

export const CHANGE_KIND_LABEL: Record<TokenChangeKind, string> = {
  modified: '已修改',
  added: '新增',
  removed: '删除',
}

const COLOR_FIELDS: { key: 'primary' | 'secondary'; label: string }[] = [
  { key: 'primary', label: '主色' },
  { key: 'secondary', label: '辅助色' },
]

const SCALE_GROUPS: { key: TokenScaleKey; label: string; tokenPrefix: string }[] = [
  { key: 'radiusScale', label: '圆角', tokenPrefix: 'radius' },
  { key: 'spacingScale', label: '间距', tokenPrefix: 'spacing' },
  { key: 'typeScale', label: '字号', tokenPrefix: 'type' },
]

export function formatTokenValue(key: TokenField, value: string | number): string {
  return key === 'primary' || key === 'secondary' ? String(value) : `${value}px`
}

/**
 * 逐项对比两个版本的令牌。颜色按字段比较，尺度按层级位置（index）对齐：
 * 一侧缺少的层级记为新增/删除，不会因数组长度不同而错位。
 */
export function diffTokens(beforeTokens: BrandTokens, afterTokens: BrandTokens): TokenDiff {
  const colorChanges: TokenChange[] = COLOR_FIELDS.flatMap(({ key, label }) => {
    const before = beforeTokens[key]
    const after = afterTokens[key]
    return before === after ? [] : [{ key, label, tokenName: key, index: null, kind: 'modified' as const, before, after }]
  })

  const groups: TokenGroupDiff[] = [
    { key: 'color', label: '品牌色', rows: colorChanges, changeCount: colorChanges.length, beforeLevelCount: null, afterLevelCount: null },
    ...SCALE_GROUPS.map(({ key, label, tokenPrefix }) => {
      const beforeScale = beforeTokens[key]
      const afterScale = afterTokens[key]
      const rows: TokenChange[] = []
      for (let index = 0; index < Math.max(beforeScale.length, afterScale.length); index += 1) {
        const beforeValue = index < beforeScale.length ? beforeScale[index] : null
        const afterValue = index < afterScale.length ? afterScale[index] : null
        if (beforeValue === afterValue) continue
        const kind: TokenChangeKind = beforeValue === null ? 'added' : afterValue === null ? 'removed' : 'modified'
        rows.push({
          key,
          label: `层级 ${index + 1}`,
          tokenName: `${tokenPrefix}.${index + 1}`,
          index,
          kind,
          before: beforeValue === null ? null : formatTokenValue(key, beforeValue),
          after: afterValue === null ? null : formatTokenValue(key, afterValue),
        })
      }
      return { key, label, rows, changeCount: rows.length, beforeLevelCount: beforeScale.length, afterLevelCount: afterScale.length }
    }),
  ]

  return { groups, changeCount: groups.reduce((total, group) => total + group.changeCount, 0) }
}

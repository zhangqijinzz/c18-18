import { CHANGE_KIND_LABEL, diffTokens } from '../domain/brandRules'
import type { BrandMirrorSnapshot } from '../models/brandMirrorModels'

export interface BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void
}

function buildCompareSection(snapshot: BrandMirrorSnapshot): string {
  if (snapshot.versions.length < 2) return ''
  const [before, after] = snapshot.versions.slice(-2)
  const diff = diffTokens(before.tokens, after.tokens)
  const lines = [
    '## 版本对比',
    '',
    `对比版本：${before.label} → ${after.label}`,
    `变化条数：**${diff.changeCount} 项**`,
    '',
    '| 分组 | 令牌 | 变化类型 | Version A（旧） | Version B（新） |',
    '| --- | --- | --- | --- | --- |',
  ]
  for (const group of diff.groups) {
    if (group.rows.length === 0) {
      lines.push(`| ${group.label} | — | 无变化 | — | — |`)
      continue
    }
    group.rows.forEach((row, rowIndex) => {
      lines.push(
        `| ${rowIndex === 0 ? group.label : ''} | \`${row.tokenName}\` ${row.label} | ${CHANGE_KIND_LABEL[row.kind]} | ${row.before ?? '—'} | ${row.after ?? '—'} |`,
      )
    })
  }
  lines.push('', '> 层级数量不一致时按层级位置逐项对齐；“—”表示该版本缺少此层级。', '')
  return lines.join('\n')
}

export function buildBrandGuidelinesMarkdown(snapshot: BrandMirrorSnapshot): string {
  const { tokens } = snapshot
  const versions = snapshot.versions.length === 0 ? '- 暂无保存版本' : snapshot.versions.map((version) => `- ${version.label} · ${version.createdAt.slice(0, 10)} · 主色 ${version.tokens.primary} · 辅助色 ${version.tokens.secondary}`).join('\n')
  const compareSection = buildCompareSection(snapshot)
  return `# BrandMirror 品牌规范

> 导出时间：${new Date().toISOString().slice(0, 10)}
> 当前主题：${snapshot.theme}

## 品牌色

| 令牌 | 值 |
| --- | --- |
| 主色 \`primary\` | \`${tokens.primary}\` |
| 辅助色 \`secondary\` | \`${tokens.secondary}\` |
| 对比度 | ${snapshot.contrastRatio.toFixed(1)}:1 |

## 圆角尺度

${tokens.radiusScale.map((value, index) => `- \`radius.${index + 1}\`: ${value}px`).join('\n')}

## 间距体系

${tokens.spacingScale.map((value, index) => `- \`spacing.${index + 1}\`: ${value}px`).join('\n')}

## 字体比例

${tokens.typeScale.map((value, index) => `- \`type.${index + 1}\`: ${value}px`).join('\n')}

${compareSection}## 保存版本

${versions}

---
由 BrandMirror 品牌视觉实验室生成。
`
}

export class BrowserBrandGuidelinesExporter implements BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void {
    const content = buildBrandGuidelinesMarkdown(snapshot)
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BrandMirror-Brand-Guidelines-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }
}

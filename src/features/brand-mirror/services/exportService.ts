import type { BrandMirrorSnapshot } from '../models/brandMirrorModels'
import { DIFF_STATUS_LABEL, diffFromVersions } from '../versioning/versionDiff'

export interface BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void
}

function renderDiffValue(value: string | null, kind: 'color' | 'scale'): string {
  if (value === null) return '—'
  return kind === 'scale' ? `${value}px` : `\`${value}\``
}

function buildVersionCompareSection(snapshot: BrandMirrorSnapshot): string {
  const diff = diffFromVersions(snapshot.versions)
  if (!diff) return '## 版本对比\n\n保存两个版本后，这里会逐项列出颜色、圆角、间距、字号的差异。\n'
  const groupSummaries = diff.groups.map((group) => `${group.label} ${group.changeCount} 项`).join(' · ')
  const sections = diff.groups.map((group) => {
    const rows = group.rows
      .map((row) => `| ${DIFF_STATUS_LABEL[row.status]} | ${row.label} \`${row.token}\` | ${renderDiffValue(row.before, row.kind)} | ${renderDiffValue(row.after, row.kind)} |`)
      .join('\n')
    return `### ${group.label}（${group.changeCount} 项变化）\n\n| 状态 | 令牌 | ${diff.before.label} | ${diff.after.label} |\n| --- | --- | --- | --- |\n${rows}`
  }).join('\n\n')
  return `## 版本对比\n\n对比 ${diff.before.label} → ${diff.after.label}：**共 ${diff.changeCount} 项变化**（${groupSummaries}）。\n\n${sections}\n`
}

export function buildBrandGuidelinesMarkdown(snapshot: BrandMirrorSnapshot): string {
  const { tokens } = snapshot
  const versions = snapshot.versions.length === 0 ? '- 暂无保存版本' : snapshot.versions.map((version) => `- ${version.label} · ${version.createdAt.slice(0, 10)} · 主色 ${version.tokens.primary} · 辅助色 ${version.tokens.secondary}`).join('\n')
  return `# BrandMirror 品牌规范\n\n> 导出时间：${new Date().toISOString().slice(0, 10)}\n> 当前主题：${snapshot.theme}\n\n## 品牌色\n\n| 令牌 | 值 |\n| --- | --- |\n| 主色 \`primary\` | \`${tokens.primary}\` |\n| 辅助色 \`secondary\` | \`${tokens.secondary}\` |\n| 对比度 | ${snapshot.contrastRatio.toFixed(1)}:1 |\n\n## 圆角尺度\n\n${tokens.radiusScale.map((value, index) => `- \`radius.${index + 1}\`: ${value}px`).join('\n')}\n\n## 间距体系\n\n${tokens.spacingScale.map((value, index) => `- \`spacing.${index + 1}\`: ${value}px`).join('\n')}\n\n## 字体比例\n\n${tokens.typeScale.map((value, index) => `- \`type.${index + 1}\`: ${value}px`).join('\n')}\n\n${buildVersionCompareSection(snapshot)}\n## 保存版本\n\n${versions}\n\n---\n由 BrandMirror 品牌视觉实验室生成。\n`
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

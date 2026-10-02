import { cloneTokens } from '../domain/brandRules'
import type { BrandMirrorSnapshot, SavedVersion } from '../models/brandMirrorModels'
import { DIFF_GROUPS, DIFF_STATUS_LABEL, diffFromVersions, type DiffRow, type VersionDiff } from './versionDiff'

interface VersionCompareProps {
  snapshot: BrandMirrorSnapshot
  onSave: () => void
  onToggle: () => void
  onExport: () => void
}

export function VersionCompare({ snapshot, onSave, onToggle, onExport }: VersionCompareProps) {
  const versions = snapshot.versions.slice(-2)
  const hasCompare = versions.length === 2
  // 对比结论始终基于最近两个版本逐项计算，UI 与导出共用同一份差异模型
  const diff = hasCompare ? diffFromVersions(snapshot.versions) : null
  return (
    <section className="version-section">
      <div className="showcase-heading">
        <div>
          <span className="eyebrow">04 / VERSIONS</span>
          <h2>版本对比</h2>
        </div>
        <div className="version-actions">
          <button className="export-button" type="button" onClick={onExport}>↓ 导出品牌规范</button>
          <button className="secondary-button" type="button" onClick={onSave}>＋ 保存当前版本</button>
          <button className="primary-button" type="button" disabled={!hasCompare} onClick={onToggle}>{snapshot.compareMode ? '退出对比' : '打开对比视图'} <span>↗</span></button>
        </div>
      </div>
      {!hasCompare ? (
        <div className="version-empty">
          <div className="empty-icon">A/B</div>
          <div>
            <strong>保存两个版本，开始对照</strong>
            <p>先保存当前状态作为 Version A，再调整令牌并保存 Version B。</p>
          </div>
          <span className="empty-arrow">→</span>
        </div>
      ) : snapshot.compareMode && diff ? (
        <VersionDiffPanel diff={diff} activeVersionId={snapshot.activeVersionId} />
      ) : (
        <div className="version-cards">
          {versions.map((version) => <VersionCard key={version.id} version={version} active={snapshot.activeVersionId === version.id} />)}
        </div>
      )}
    </section>
  )
}

function VersionDiffPanel({ diff, activeVersionId }: { diff: VersionDiff; activeVersionId: string | null }) {
  return (
    <div className="version-diff">
      <div className="diff-summary">
        <div className="diff-summary-head">
          <strong>共 {diff.changeCount} 项变化</strong>
          <span className="diff-summary-meta">
            {DIFF_GROUPS.map((group) => {
              const count = diff.groups.find((item) => item.key === group.key)?.changeCount ?? 0
              return <span key={group.key} className={count > 0 ? 'is-changed' : ''}>{group.label} {count}</span>
            })}
          </span>
        </div>
        <div className="diff-columns">
          <div className="diff-version-col">
            <span className="diff-version-label">{diff.before.label}</span>
            <small>{diff.before.createdAt.slice(0, 10)} · {activeVersionId === diff.before.id ? '当前版本' : '历史版本'}</small>
          </div>
          <div className="diff-version-col right">
            <span className="diff-version-label">{diff.after.label}</span>
            <small>{diff.after.createdAt.slice(0, 10)} · {activeVersionId === diff.after.id ? '当前版本' : '历史版本'}</small>
          </div>
        </div>
      </div>
      {diff.groups.map((group) => (
        <div className="diff-group" key={group.key}>
          <div className="diff-group-head">
            <span>{group.label}</span>
            <small>{group.changeCount > 0 ? `${group.changeCount} 项变化` : '无变化'}</small>
          </div>
          {group.rows.map((row) => <DiffRowView key={row.key} row={row} />)}
        </div>
      ))}
      {diff.changeCount === 0 && <div className="diff-no-change">两个版本的视觉令牌完全一致，没有差异。</div>}
    </div>
  )
}

function DiffRowView({ row }: { row: DiffRow }) {
  return (
    <div className={`diff-row diff-${row.status}`}>
      <div className="diff-row-name">
        <span className={`diff-badge diff-badge-${row.status}`}>{DIFF_STATUS_LABEL[row.status]}</span>
        <span className="diff-row-label">{row.label}</span>
        <code>{row.token}</code>
      </div>
      <DiffCell value={row.before} kind={row.kind} />
      <span className="diff-arrow">→</span>
      <DiffCell value={row.after} kind={row.kind} />
    </div>
  )
}

function DiffCell({ value, kind }: { value: string | null; kind: DiffRow['kind'] }) {
  if (value === null) return <div className="diff-cell empty">—</div>
  return (
    <div className="diff-cell">
      {kind === 'color' && <span className="diff-swatch" style={{ background: value }} />}
      <code>{value}{kind === 'scale' ? 'px' : ''}</code>
    </div>
  )
}

function VersionCard({ version, active }: { version: SavedVersion; active: boolean }) {
  const preview = cloneTokens(version.tokens)
  return (
    <div className={`version-card ${active ? 'active' : ''}`}>
      <div className="version-card-head">
        <span>{version.label}</span>
        <small>{active ? '当前版本' : '历史版本'}</small>
      </div>
      <div className="version-preview" style={{ background: preview.secondary, borderRadius: preview.radiusScale[2] }}>
        <div className="version-preview-top" style={{ background: preview.primary }} />
        <div className="version-preview-copy"><i /><i /><i /></div>
        <span className="version-preview-button" style={{ background: preview.primary, borderRadius: preview.radiusScale[0] }} />
      </div>
      <div className="version-swatch-row">
        <span style={{ background: preview.primary }} />
        <span style={{ background: preview.secondary }} />
        <span>圆角 {preview.radiusScale[1]}px</span>
        <span>字号 {preview.typeScale[2]}px</span>
      </div>
    </div>
  )
}

import { CHANGE_KIND_LABEL, cloneTokens, diffTokens, type TokenChange, type TokenDiff } from '../domain/brandRules'
import type { SavedVersion, BrandMirrorSnapshot } from '../models/brandMirrorModels'

interface VersionCompareProps {
  snapshot: BrandMirrorSnapshot
  onSave: () => void
  onToggle: () => void
  onExport: () => void
}

export function VersionCompare({ snapshot, onSave, onToggle, onExport }: VersionCompareProps) {
  const [before, after] = snapshot.versions.slice(-2)
  const hasCompare = Boolean(before && after)
  const diff = hasCompare ? diffTokens(before.tokens, after.tokens) : null
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
          <button className="primary-button" type="button" disabled={!hasCompare} onClick={onToggle}>
            {snapshot.compareMode ? '退出对比' : '打开对比视图'} <span>↗</span>
          </button>
        </div>
      </div>
      {hasCompare && diff ? (
        <>
          <div className="version-cards">
            <VersionCard label={before.label} tokens={before.tokens} active={snapshot.activeVersionId === before.id} />
            <VersionCard label={after.label} tokens={after.tokens} active={snapshot.activeVersionId === after.id} />
          </div>
          {snapshot.compareMode ? (
            <ComparePanel before={before} after={after} diff={diff} />
          ) : (
            <p className="compare-hint">检测到 {diff.changeCount} 项差异（颜色 / 圆角 / 间距 / 字号），打开对比视图逐项核对。</p>
          )}
        </>
      ) : (
        <div className="version-empty">
          <div className="empty-icon">A/B</div>
          <div>
            <strong>保存两个版本，开始对照</strong>
            <p>先保存当前状态作为 Version A，再调整令牌并保存 Version B。</p>
          </div>
          <span className="empty-arrow">→</span>
        </div>
      )}
    </section>
  )
}

function ComparePanel({ before, after, diff }: { before: SavedVersion; after: SavedVersion; diff: TokenDiff }) {
  return (
    <div className="compare-panel">
      <div className="compare-summary">
        <strong>共 {diff.changeCount} 项变化</strong>
        <span>{before.label} → {after.label}，层级数量不一致时按位置对齐，“—”表示该版本缺少此层级。</span>
      </div>
      <div className="compare-groups">
        {diff.groups.map((group) => {
          const levelMismatch = group.beforeLevelCount !== null && group.afterLevelCount !== null && group.beforeLevelCount !== group.afterLevelCount
          return (
            <section className="compare-group" key={group.key}>
              <header className="compare-group-head">
                <span className="compare-group-label">{group.label}</span>
                {group.beforeLevelCount !== null && group.afterLevelCount !== null && (
                  <span className={`compare-level-note ${levelMismatch ? 'mismatch' : ''}`}>
                    层级 {before.label} {group.beforeLevelCount} 级 · {after.label} {group.afterLevelCount} 级{levelMismatch ? '（按位置对齐）' : ''}
                  </span>
                )}
                <span className={`compare-group-count ${group.changeCount > 0 ? 'changed' : ''}`}>
                  {group.changeCount > 0 ? `${group.changeCount} 项变化` : '无变化'}
                </span>
              </header>
              <div className="compare-table">
                <div className="compare-row compare-row-head">
                  <span>令牌</span>
                  <span className="compare-side compare-side-before">{before.label}</span>
                  <span className="compare-arrow-col" />
                  <span className="compare-side compare-side-after">{after.label}</span>
                </div>
                {group.rows.length === 0 ? (
                  <div className="compare-nochange">该分组没有变化</div>
                ) : (
                  group.rows.map((row) => <CompareRow key={`${row.key}-${row.index ?? row.key}`} row={row} />)
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function CompareRow({ row }: { row: TokenChange }) {
  return (
    <div className={`compare-row change-${row.kind}`}>
      <span className="compare-token">
        <code>{row.tokenName}</code>
        <small>{row.label}</small>
        <em className={`change-badge badge-${row.kind}`}>{CHANGE_KIND_LABEL[row.kind]}</em>
      </span>
      <CompareValue row={row} side="before" />
      <span className="compare-arrow-col">{row.kind === 'added' ? '＋' : row.kind === 'removed' ? '－' : '→'}</span>
      <CompareValue row={row} side="after" />
    </div>
  )
}

function CompareValue({ row, side }: { row: TokenChange; side: 'before' | 'after' }) {
  const value = side === 'before' ? row.before : row.after
  const isColor = row.key === 'primary' || row.key === 'secondary'
  return (
    <span className={`compare-value value-${side}`}>
      {value === null ? <i>—</i> : (
        <>
          {isColor && <span className="value-swatch" style={{ background: value }} />}
          {value}
        </>
      )}
    </span>
  )
}

function VersionCard({ label, tokens, active }: { label: string; tokens: BrandMirrorSnapshot['tokens']; active: boolean }) {
  const preview = cloneTokens(tokens)
  return (
    <div className={`version-card ${active ? 'active' : ''}`}>
      <div className="version-card-head"><span>{label}</span><small>{active ? '当前版本' : '历史版本'}</small></div>
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

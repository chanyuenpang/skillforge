import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getKnowledgeAssets } from '../api';
import { StatusBadge } from './StatusBadge';

function formatTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function renderType(type) {
  return type || 'unknown';
}


function isWeakTitle(v) {
  if (typeof v !== "string") return true;
  const trimmed = v.trim();
  if (!trimmed) return true;
  const WEAK = /^[\s\-_.…··]+$/;
  if (WEAK.test(trimmed)) return true;
  const WEAK_WORDS = new Set(["-", "--", "...", "untitled", "unnamed", "n/a", "none", "null", "undefined", "unknown", "无", "未命名", "暂无", "na", "nil", "empty", "tbd", "todo"]);
  if (WEAK_WORDS.has(trimmed.toLowerCase())) return true;
  return false;
}

function getDisplayTitle(item) {
  if (item?.title && !isWeakTitle(item.title)) return item.title;
  if (item?.name && !isWeakTitle(item.name)) return item.name;
  return item?.id || "-";
}

function getSecondaryLabel(item) {
  const candidates = [item?.name, item?.title].filter((v) => v && !isWeakTitle(v));
  const unique = Array.from(new Set(candidates));
  if (unique.length <= 1) return null;
  return unique.join(" · ");
}

export default function KnowledgeAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getKnowledgeAssets();
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || '加载知识资产失败');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="card">
        <div className="card-header">
          <h2>📚 知识资产</h2>
        </div>
        <div className="card-body">
          {loading && <div className="loading">加载中…</div>}

          {!loading && error && (
            <div className="action-feedback feedback-error">加载失败：{error}</div>
          )}

          {!loading && !error && !items.length && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无知识资产</p>
            </div>
          )}

          {!loading && !error && !!items.length && (
            <div style={{ overflowX: 'auto' }}>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>资产标题</th>
                    <th>类型</th>
                    <th>来源路径</th>
                    <th>更新时间</th>
                    <th>状态</th>
                    <th>版本</th>
                    <th>域</th>
                    <th>ID（辅助）</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id || item.name}>
                      <td>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.4 }}>
                            <Link to={`/knowledge-assets/${encodeURIComponent(item.id)}`} className="queue-row-link">
                              {getDisplayTitle(item)}
                            </Link>
                          </div>
                          {getSecondaryLabel(item) ? (
                            <div className="subtle" style={{ fontSize: '0.78rem' }}>{getSecondaryLabel(item)}</div>
                          ) : null}
                        </div>
                      </td>
                      <td><span className="badge badge-idle">{renderType(item.type)}</span></td>
                      <td className="td-mono">{item.sourcePath || '-'}</td>
                      <td className="td-time">{formatTime(item.updatedAt)}</td>
                      <td>{item.status ? <StatusBadge status={item.status} /> : '-'}</td>
                      <td>{item.version || '-'}</td>
                      <td>{item.domain || '-'}</td>
                      <td className="td-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: 'var(--space-sm) var(--space-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                共 {items.length} 条
              </div>
            </div>
          )}
        </div>
      </div>

      {!loading && !error && items.filter((i) => i.description).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>📝 资产说明</h2>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              {items.filter((i) => i.description).slice(0, 8).map((i) => (
                <li key={`desc-${i.id}`}>
                  <Link to={`/knowledge-assets/${encodeURIComponent(i.id)}`}>
                    {i.title || i.name || i.id}
                  </Link>
                  ：{i.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

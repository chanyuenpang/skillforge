import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getKnowledgeAssetDetail } from '../api';
import { StatusBadge } from './StatusBadge';

function formatTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function MetaTable({ detail }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>📋 元信息</h2>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <table className="queue-table">
          <tbody>
            <tr><td style={{ width: 140, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID</td><td>{detail.id || '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>名称</td><td>{detail.name || '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>标题</td><td>{detail.title || '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>类型</td><td><span className="badge badge-idle">{detail.type || 'unknown'}</span></td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>来源路径</td><td className="td-mono">{detail.sourcePath || '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>更新时间</td><td className="td-time">{formatTime(detail.updatedAt)}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>状态</td><td>{detail.status ? <StatusBadge status={detail.status} /> : '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>版本</td><td>{detail.version || '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>领域</td><td>{detail.domain || '-'}</td></tr>
            <tr><td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>说明</td><td>{detail.description || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KnowledgeAssetDetailPage() {
  const { assetId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getKnowledgeAssetDetail(assetId);
        if (!cancelled) setDetail(data || null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || '加载知识资产详情失败');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header"><h2>知识资产详情</h2></div>
        <div className="card-body"><div className="loading">加载中…</div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header"><h2>知识资产详情</h2></div>
        <div className="card-body">
          <div className="action-feedback feedback-error">加载失败：{error}</div>
          <Link to="/knowledge-assets" className="btn btn-ghost" style={{ marginTop: 'var(--space-md)' }}>← 返回列表</Link>
        </div>
      </div>
    );
  }

  if (!detail || !detail.id) {
    return (
      <div className="card">
        <div className="card-header"><h2>知识资产详情</h2></div>
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>未找到该资产</p>
          </div>
          <Link to="/knowledge-assets" className="back-link">← 返回列表</Link>
        </div>
      </div>
    );
  }

  const type = detail.type || 'unknown';
  const docContent = detail.contentPreview || detail.content || '';
  const skillReadme = detail.readme || detail.skillContent || '';
  const files = Array.isArray(detail.files) ? detail.files : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <Link to="/knowledge-assets" className="back-link">← 返回列表</Link>
      <MetaTable detail={detail} />

      {type === 'doc' && (
        <div className="card">
          <div className="card-header"><h2>📄 文档内容</h2></div>
          <div className="card-body">
            {docContent ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7 }}>{docContent}</pre> : <p className="subtle">暂无文档内容</p>}
          </div>
        </div>
      )}

      {type === 'skill-fixture' && (
        <>
          <div className="card">
            <div className="card-header"><h2>📖 技能说明</h2></div>
            <div className="card-body">
              {skillReadme ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7 }}>{skillReadme}</pre> : <p className="subtle">暂无 readme / skillContent</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>📁 文件列表</h2></div>
            <div className="card-body">
              {!files.length ? (
                <p className="subtle">暂无 files</p>
              ) : (
                <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
                  {files.map((file, idx) => (
                    <li key={`${file.path || file.name || 'file'}-${idx}`}>
                      <strong>{file.name || file.path || `文件 ${idx + 1}`}</strong>
                      {file.path ? <> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', background: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 4 }}>{file.path}</code></> : null}
                      {file.size != null ? <> · {file.size}</> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>🔧 扩展元数据</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              {detail.metadata && typeof detail.metadata === 'object' ? (
                <table className="queue-table">
                  <tbody>
                    {Object.entries(detail.metadata).map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ width: 160, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</td>
                        <td>{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '[complex value]'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="card-body"><p className="subtle">暂无 metadata</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {type !== 'doc' && type !== 'skill-fixture' && (
        <div className="card">
          <div className="card-header"><h2>内容预览</h2></div>
          <div className="card-body">
            <p className="subtle">当前类型暂未定义专用渲染，已展示元信息。</p>
          </div>
        </div>
      )}
    </div>
  );
}

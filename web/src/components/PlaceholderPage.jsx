import React from 'react';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="card-body">
        <div className="empty-state">
          <div className="empty-icon">🚧</div>
          <p>{description || '该模块正在建设中。'}</p>
          <p className="text-muted" style={{ marginTop: 4 }}>敬请期待更多功能上线</p>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

const STATUS_MAP = {
  pending:  { className: 'badge-pending',  label: '待审批' },
  granted:  { className: 'badge-granted',  label: '已通过' },
  denied:   { className: 'badge-denied',   label: '已拒绝' },
  idle:     { className: 'badge-idle',     label: '空闲' },
  ready:    { className: 'badge-ready',    label: '待审核' },
  approved: { className: 'badge-approved', label: '已审核' },
  rejected: { className: 'badge-rejected', label: '已驳回' },
  blocked:  { className: 'badge-blocked',  label: '已阻塞' },
};

const SEVERITY_MAP = {
  low:      { className: 'badge-low',      label: '低' },
  medium:   { className: 'badge-medium',   label: '中' },
  high:     { className: 'badge-high',     label: '高' },
  critical: { className: 'badge-critical', label: '严重' },
};

export function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { className: 'badge-idle', label: status };
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

export function SeverityBadge({ severity }) {
  const info = SEVERITY_MAP[severity] || { className: 'badge-low', label: severity };
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

import React from 'react';

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return <div className="empty-state"><p>暂无时间线事件</p></div>;
  }

  const dotClass = (kind) => {
    if (kind === 'risk-event') return 'risk';
    if (kind === 'review-event') return 'review';
    if (kind === 'approval-event') return 'approval';
    return '';
  };

  const dotIcon = (kind) => {
    if (kind === 'risk-event') return '⚠';
    if (kind === 'review-event') return '🔍';
    if (kind === 'approval-event') return '✅';
    return '●';
  };

  const typeLabel = (event) => {
    if (event.type === 'RiskFactObserved') return '风险发现';
    if (event.type === 'ReviewRequested') return '审核请求';
    if (event.type === 'ReviewApproved') return '审核通过';
    if (event.type === 'ReviewRejected') return '审核驳回';
    if (event.type === 'ReviewResubmitted') return '重新提交';
    if (event.type === 'ApprovalRequested') return '审批请求';
    if (event.type === 'ApprovalGranted') return '审批通过';
    if (event.type === 'ApprovalDenied') return '审批拒绝';
    return event.type;
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString('zh-CN');
    } catch {
      return ts;
    }
  };

  return (
    <div className="timeline">
      {events.map((event, idx) => (
        <div key={event.eventId || idx} className="timeline-item">
          <div className={`timeline-dot ${dotClass(event.kind)}`}>
            {dotIcon(event.kind)}
          </div>
          <div className="timeline-content">
            <div className="timeline-head">
              <span className="timeline-type">{typeLabel(event)}</span>
              <span className="timeline-time">{formatTime(event.recordedAt)}</span>
            </div>
            <div className="timeline-body">
              {event.summary && <div>📋 {event.summary}</div>}
              {event.riskType && <div>风险类型: {event.riskType}</div>}
              {event.severity && <div>严重程度: {event.severity}</div>}
              {event.reason && <div>原因: {event.reason}</div>}
              {event.decision && <div>决策: {event.decision}</div>}
              {event.status && <div>状态: {event.status}</div>}
              {event.round && <div>轮次: 第 {event.round} 轮</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

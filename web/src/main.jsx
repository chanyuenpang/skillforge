import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/tokens.css';

function GlobalErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div style={{ maxWidth: 520, margin: '10vh auto', textAlign: 'center', padding: 'var(--space-xl)' }}>
      <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>💥</div>
      <h1 style={{ marginBottom: 'var(--space-sm)' }}>应用异常</h1>
      <p
        className="subtle"
        style={{ marginBottom: 'var(--space-lg)', wordBreak: 'break-all' }}
      >
        {error?.message || '应用发生了无法恢复的错误，请尝试刷新页面。'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={resetErrorBoundary}>
          🔄 重试
        </button>
        <a href="/" className="btn">
          🏠 返回首页
        </a>
        <button className="btn" onClick={() => window.location.reload()}>
          🔁 刷新页面
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      title="应用异常"
      showHomeLink={false}
      showBackLink={false}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <GlobalErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      )}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

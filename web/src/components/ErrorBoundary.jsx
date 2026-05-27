import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 通用 ErrorBoundary
 *
 * Props:
 *   title          — 错误标题（默认: "页面出错了"）
 *   showHomeLink   — 是否显示返回首页（默认 true）
 *   showBackLink   — 是否显示返回列表
 *   backTo         — 返回链接地址（如 "/run-center/runs"）
 *   fallbackRender — 自定义 fallback renderer: ({ error, resetErrorBoundary }) => JSX
 *   onReset        — 重试前回调
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', this.props.title || 'unknown', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        });
      }
      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
          title={this.props.title}
          showHomeLink={this.props.showHomeLink ?? true}
          showBackLink={this.props.showBackLink}
          backTo={this.props.backTo}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetErrorBoundary, title, showHomeLink, showBackLink, backTo }) {
  return (
    <section className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>⚠️</div>
      <h2 style={{ marginBottom: 'var(--space-sm)' }}>{title || '页面出错了'}</h2>
      <p
        className="subtle"
        style={{ maxWidth: 480, margin: '0 auto var(--space-md)', wordBreak: 'break-all' }}
      >
        {error?.message || '发生了未知错误，请稍后重试。'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={resetErrorBoundary}>
          🔄 重试
        </button>
        {showBackLink && backTo && (
          <Link to={backTo} className="btn">
            ← 返回列表
          </Link>
        )}
        {showHomeLink && (
          <Link to="/" className="btn">
            🏠 返回首页
          </Link>
        )}
      </div>
    </section>
  );
}

export default ErrorBoundary;

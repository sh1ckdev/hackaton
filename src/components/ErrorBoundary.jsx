import React from 'react';
import Logo from './Logo';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="login-surface">
          <div className="login-logo">
            <span className="login-logo-icon">{'>'}</span>
            <Logo showVersion={false} asLink={false} />
          </div>

          <div className="login-terminal error-boundary-terminal">
            <div className="login-terminal-header">
              <div className="login-terminal-dots" aria-hidden="true">
                <span className="login-dot-circle red"></span>
                <span className="login-dot-circle yellow"></span>
                <span className="login-dot-circle green"></span>
              </div>
              <div className="login-terminal-title">error_handler.sh</div>
            </div>

            <div className="login-terminal-body">

              <div className="login-terminal-divider"></div>
              <div className="login-auth-title">Технические неполадки</div>
              <p className="error-boundary-text">
                Произошла непредвиденная ошибка. Пожалуйста, обновите страницу или вернитесь на главную.
              </p>

              <div className="error-boundary-actions">
                <button
                  onClick={() => window.location.reload()}
                  className="login-telegram-button"
                >
                  Обновить страницу
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="login-vk-button"
                >
                  На главную
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="error-boundary-details">
                  <summary className="error-boundary-details-summary">Детали ошибки (только в разработке)</summary>
                  <pre className="error-boundary-details-pre">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>

          <div className="login-terminal-note">Если проблема повторяется, обратитесь в поддержку.</div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

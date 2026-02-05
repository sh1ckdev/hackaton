import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
          <div className="max-w-md w-full glass rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Что-то пошло не так
            </h2>
            <p className="text-white/70 mb-6">
              Произошла непредвиденная ошибка. Пожалуйста, обновите страницу.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-terminal-green text-terminal-bg font-semibold rounded-lg hover:bg-terminal-green/90 transition-all"
            >
              Обновить страницу
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-white/70 cursor-pointer text-sm">
                  Детали ошибки (только в разработке)
                </summary>
                <pre className="mt-2 text-xs text-terminal-red bg-terminal-dark p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

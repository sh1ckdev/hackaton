import React from 'react';
import { observer } from 'mobx-react-lite';
import Logo from './Logo';

const BackendDownPage = () => (
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
        <div className="login-auth-title">Технические неполадки</div>
        <p className="error-boundary-text">
          Приложение временно недоступно. Пожалуйста, обновите страницу позже или вернитесь на главную.
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
      </div>
    </div>

    <div className="login-terminal-note">Если проблема повторяется, обратитесь в поддержку.</div>
  </section>
);

export default observer(BackendDownPage);

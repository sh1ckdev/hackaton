import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const NotFound = () => {
  useDocumentTitle('404 — Страница не найдена');
  const location = useLocation();
  const [typed, setTyped] = useState('');
  const command = `GET ${location.pathname} HTTP/1.1`;

  // Эффект печатающегося текста
  useEffect(() => {
    let i = 0;
    setTyped('');
    const interval = setInterval(() => {
      if (i < command.length) {
        setTyped(command.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [command]);

  return (
    <div className="not-found-page">
      <div className="not-found-terminal">
        {/* Терминальная шапка */}
        <div className="not-found-terminal-bar">
          <span className="not-found-dot not-found-dot-red" />
          <span className="not-found-dot not-found-dot-yellow" />
          <span className="not-found-dot not-found-dot-green" />
          <span className="not-found-terminal-title">bash — platform-shell</span>
        </div>

        <div className="not-found-terminal-body">
          {/* Ввод запроса */}
          <div className="not-found-line">
            <span className="not-found-prompt">sys@platform:~$</span>
            <span className="not-found-cmd">&nbsp;{typed}</span>
            <span className="not-found-cursor" />
          </div>

          {/* Ответ */}
          <div className="not-found-response">
            <p className="not-found-status-line">
              <span className="not-found-code">404</span>
              <span className="not-found-message">Not Found</span>
            </p>
            <p className="not-found-detail">
              &gt; Ресурс <span className="not-found-path">{location.pathname}</span> не существует
            </p>
            <p className="not-found-detail">&gt; Проверьте адрес или вернитесь на главную</p>
          </div>

          {/* Большая цифра */}
          <div className="not-found-big">404</div>

          {/* Действия */}
          <div className="not-found-actions">
            <Link to="/" className="not-found-btn not-found-btn-primary">
              ← На главную
            </Link>
            <Link to="/profile" className="not-found-btn not-found-btn-secondary">
              Профиль
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

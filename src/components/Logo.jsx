import { Link } from 'react-router-dom';

const Logo = ({ className = '', showVersion = true, asLink = true }) => {
  const content = (
    <div className={`app-brand ${className}`}>
      <span className="app-brand-icon">C</span>
      <span className="app-brand-text">CodeSprint</span>
      {showVersion && <span className="app-brand-version">v26.0</span>}
    </div>
  );

  if (asLink) {
    return <Link to="/" style={{ textDecoration: 'none' }}>{content}</Link>;
  }

  return content;
};

export default Logo;

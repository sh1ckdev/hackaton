import { Link } from 'react-router-dom';
import codeSprintLogo from '../assets/codesprintlogo.svg';

const Logo = ({ className = '', showVersion = true, asLink = true }) => {
  const content = (
    <div className={`app-brand ${className}`}>
      <img src={codeSprintLogo} alt="CodeSprint" className="app-brand-logo" />
      {showVersion && <span className="app-brand-version">v26.0</span>}
    </div>
  );

  if (asLink) {
    return <Link to="/" style={{ textDecoration: 'none' }}>{content}</Link>;
  }

  return content;
};

export default Logo;

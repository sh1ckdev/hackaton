import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import SupportChat from '../components/SupportChat';

/**
 * Отдельная страница чата поддержки.
 * На мобиле — полноэкранный мессенджер.
 * На десктопе — чат в правом нижнем углу (как FAB).
 */
const SupportPage = () => {
  useDocumentTitle('Поддержка');
  const navigate = useNavigate();

  return (
    <SupportChat onClose={() => navigate(-1)} isPage />
  );
};

export default SupportPage;

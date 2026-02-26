import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import api from '../utils/api';

const Info = () => {
  useDocumentTitle('Информация');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/info')
      .then(r => setContent(r.data.content || ''))
      .catch(() => setContent(''))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="glass rounded-xl p-6">
        {loading ? (
          <div className="text-white/50 text-sm">Загрузка...</div>
        ) : content ? (
          <div className="info-markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-white/50">Информация пока не добавлена.</p>
        )}
      </div>
    </div>
  );
};

export default Info;

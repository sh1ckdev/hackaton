import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Info = () => {
  useDocumentTitle('Информация');
  
  return (
    <div className="px-4 py-6">
      <div className="glass rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-white mb-3">Информация</h1>
        <p className="text-white/70">
          Здесь можно разместить правила хакатона, сроки, критерии оценки и полезные ссылки.
        </p>
      </div>
    </div>
  );
};

export default Info;

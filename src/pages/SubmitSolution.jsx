import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';

const SubmitSolution = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    repository_url: '',
    demo_url: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    casesStore.fetchCase(caseId);
    solutionsStore.fetchMySolutions();
    
    // Загрузка существующего решения
    const existingSolution = solutionsStore.solutions.find(
      s => s.case_id === parseInt(caseId)
    );
    if (existingSolution) {
      setFormData({
        title: existingSolution.title || '',
        description: existingSolution.description || '',
        repository_url: existingSolution.repository_url || '',
        demo_url: existingSolution.demo_url || '',
      });
    }
  }, [caseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Название обязательно');
      return;
    }

    try {
      await solutionsStore.submitSolution(formData, file);
      navigate(`/cases/${caseId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка отправки решения');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (casesStore.loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/cases/${caseId}`)}
        className="text-gray-300 hover:text-gray-400 mb-4 inline-block"
      >
        ← Назад
      </button>

      <div className="glass rounded-xl p-8">
        <h1 className="text-3xl font-semibold text-gray-100 mb-2">
          Отправить решение
        </h1>
        {casesStore.selectedCase && (
          <p className="text-gray-400 mb-6">
            Кейс: {casesStore.selectedCase.title}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Название решения{' '}
              <span className="text-terminal-red">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
              placeholder="Введите название решения"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
 Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
              placeholder="Опишите ваше решение, используемые технологии, подход и т.д."
            />
          </div>

          <div>
            <label htmlFor="repository_url" className="block text-sm font-medium text-gray-300 mb-2">
 Ссылка на репозиторий
            </label>
            <input
              type="url"
              id="repository_url"
              name="repository_url"
              value={formData.repository_url}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
              placeholder="https://github.com/username/repo"
            />
          </div>

          <div>
            <label htmlFor="demo_url" className="block text-sm font-medium text-gray-300 mb-2">
 Ссылка на демо
            </label>
            <input
              type="url"
              id="demo_url"
              name="demo_url"
              value={formData.demo_url}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
              placeholder="https://your-demo.com"
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
 Файл с решением (архив)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={(e) => setFile(e.target.files[0])}
              accept=".zip,.rar,.7z,.tar,.gz"
              className="w-full px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-green focus:outline-none rounded"
            />
            <p className="mt-1 text-sm text-gray-400">
 Максимальный размер: 50MB
            </p>
          </div>

          {error && (
            <div className="p-4 glass rounded border border-terminal-red">
              <p className="text-terminal-red text-sm">{error}</p>
            </div>
          )}

          {solutionsStore.error && (
            <div className="p-4 glass rounded border border-terminal-red">
              <p className="text-terminal-red text-sm">{solutionsStore.error}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-terminal-gray pt-4">
            <button
              type="button"
              onClick={() => navigate(`/cases/${caseId}`)}
              className="px-6 py-2 border border-terminal-gray text-gray-400 hover:border-terminal-cyan transition-all font-bold"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={solutionsStore.loading}
              className="px-6 py-2 bg-terminal-dark border border-terminal-green text-gray-300 hover:bg-terminal-green hover:text-terminal-bg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {solutionsStore.loading ? 'Отправка...' : 'Отправить решение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default observer(SubmitSolution);

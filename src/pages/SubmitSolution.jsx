import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SubmitSolution = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  const caseItem = casesStore.selectedCase;
  useDocumentTitle(caseItem ? `Отправить решение: ${caseItem.title}` : 'Отправить решение');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    github_url: '',
    demo_url: '',
  });
  const [presentationFile, setPresentationFile] = useState(null);
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
        github_url: existingSolution.github_url || '',
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

    if (!formData.github_url) {
      setError('Ссылка на GitHub репозиторий обязательна');
      return;
    }

    try {
      await solutionsStore.submitSolution(formData, presentationFile);
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
    <div className="px-4 py-6 max-w-3xl mx-auto relative z-10">
      <button
        onClick={() => navigate(`/cases/${caseId}`)}
        className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-cyan mb-6 glass px-4 py-2 rounded-lg hover:border-terminal-green transition-colors"
      >
        <ArrowLeftIcon size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span>Назад</span>
      </button>

      <div className="glass rounded-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <SolutionIcon size={32} className="text-terminal-cyan" />
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Отправить решение
              </h1>
              {casesStore.selectedCase && (
                <p className="text-gray-300">
                  Кейс: {casesStore.selectedCase.title}
                </p>
              )}
            </div>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-xs text-white/40 mb-2">
              Название *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-terminal-dark/40 border border-terminal-gray/20 text-white focus:border-white/40 focus:outline-none transition-colors"
              placeholder="Введите название решения"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs text-white/40 mb-2">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-3 bg-terminal-dark/40 border border-terminal-gray/20 text-white focus:border-white/40 focus:outline-none transition-colors resize-none"
              placeholder="Опишите ваше решение, используемые технологии, подход и т.д."
            />
          </div>

          <div>
            <label htmlFor="github_url" className="block text-xs text-white/40 mb-2">
              GitHub репозиторий *
            </label>
            <input
              type="url"
              id="github_url"
              name="github_url"
              value={formData.github_url}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-terminal-dark/40 border border-terminal-gray/20 text-white focus:border-white/40 focus:outline-none transition-colors"
              placeholder="https://github.com/username/repo"
            />
          </div>

          <div>
            <label htmlFor="demo_url" className="block text-xs text-white/40 mb-2">
              Ссылка на демо
            </label>
            <input
              type="url"
              id="demo_url"
              name="demo_url"
              value={formData.demo_url}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-terminal-dark/40 border border-terminal-gray/20 text-white focus:border-white/40 focus:outline-none transition-colors"
              placeholder="https://your-demo.com"
            />
          </div>

          <div>
            <label htmlFor="presentation" className="block text-xs text-white/40 mb-2">
              Презентация (PDF, PPT, PPTX, ODP)
            </label>
            <input
              type="file"
              id="presentation"
              name="presentation"
              onChange={(e) => setPresentationFile(e.target.files[0])}
              accept=".pdf,.ppt,.pptx,.odp"
              className="w-full px-4 py-3 bg-terminal-dark/40 border border-terminal-gray/20 text-white file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:bg-terminal-gray/40 file:text-white file:cursor-pointer cursor-pointer"
            />
          </div>

          {error && (
            <div className="text-terminal-red text-sm">
              {error}
            </div>
          )}

          {solutionsStore.error && (
            <div className="text-terminal-red text-sm">
              {solutionsStore.error}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-terminal-gray/20">
            <button
              type="button"
              onClick={() => navigate(`/cases/${caseId}`)}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={solutionsStore.loading}
              className="px-6 py-3 bg-terminal-green text-terminal-bg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {solutionsStore.loading ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default observer(SubmitSolution);

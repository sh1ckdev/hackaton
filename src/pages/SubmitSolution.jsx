import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { UploadIcon, GitHubIcon, ArrowLeftIcon, SolutionIcon } from '../components/Icons';

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
        className="group flex items-center gap-2 text-terminal-green hover:text-terminal-cyan mb-6 inline-block glass-light px-4 py-2 rounded-lg hover:bg-glass transition-all"
      >
        <ArrowLeftIcon size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span>Назад</span>
      </button>

      <div className="glass-strong rounded-2xl p-8 animate-fade-in-up relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-terminal-cyan/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 glass-light rounded-xl">
              <SolutionIcon size={32} className="text-terminal-cyan" />
            </div>
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
            <label htmlFor="title" className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <SolutionIcon size={18} className="text-terminal-cyan" />
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
              className="w-full px-4 py-3 glass-light border border-terminal-gray/40 text-white focus:border-terminal-green focus:outline-none rounded-xl focus:ring-2 focus:ring-terminal-green/50 transition-all"
              placeholder="Введите название решения"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-bold text-white mb-3">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-3 glass-light border border-terminal-gray/40 text-white focus:border-terminal-green focus:outline-none rounded-xl focus:ring-2 focus:ring-terminal-green/50 transition-all resize-none"
              placeholder="Опишите ваше решение, используемые технологии, подход и т.д."
            />
          </div>

          <div>
            <label htmlFor="github_url" className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <GitHubIcon size={18} className="text-terminal-green" />
              Ссылка на GitHub репозиторий{' '}
              <span className="text-terminal-red">*</span>
            </label>
            <input
              type="url"
              id="github_url"
              name="github_url"
              value={formData.github_url}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 glass-light border border-terminal-gray/40 text-white focus:border-terminal-green focus:outline-none rounded-xl focus:ring-2 focus:ring-terminal-green/50 transition-all"
              placeholder="https://github.com/username/repo"
            />
            <p className="mt-2 text-sm text-gray-400">
              Обязательно укажите ссылку на ваш GitHub репозиторий
            </p>
          </div>

          <div>
            <label htmlFor="demo_url" className="block text-sm font-bold text-white mb-3">
              Ссылка на демо
            </label>
            <input
              type="url"
              id="demo_url"
              name="demo_url"
              value={formData.demo_url}
              onChange={handleChange}
              className="w-full px-4 py-3 glass-light border border-terminal-gray/40 text-white focus:border-terminal-cyan focus:outline-none rounded-xl focus:ring-2 focus:ring-terminal-cyan/50 transition-all"
              placeholder="https://your-demo.com"
            />
          </div>

          <div>
            <label htmlFor="presentation" className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <UploadIcon size={18} className="text-terminal-purple" />
              Презентация (PDF, PPT, PPTX, ODP)
            </label>
            <div className="glass-light border border-terminal-gray/40 rounded-xl p-4 hover:border-terminal-purple/50 transition-all">
              <input
                type="file"
                id="presentation"
                name="presentation"
                onChange={(e) => setPresentationFile(e.target.files[0])}
                accept=".pdf,.ppt,.pptx,.odp"
                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-terminal-purple/20 file:text-terminal-purple hover:file:bg-terminal-purple/30 file:cursor-pointer cursor-pointer"
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Максимальный размер: 100MB. Презентация опциональна.
            </p>
          </div>

          {error && (
            <div className="p-4 glass-light rounded-xl border-2 border-terminal-red/50 bg-terminal-red/10">
              <p className="text-terminal-red text-sm font-medium">{error}</p>
            </div>
          )}

          {solutionsStore.error && (
            <div className="p-4 glass-light rounded-xl border-2 border-terminal-red/50 bg-terminal-red/10">
              <p className="text-terminal-red text-sm font-medium">{solutionsStore.error}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-terminal-gray/40 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/cases/${caseId}`)}
              className="px-6 py-3 glass-light border border-terminal-gray/40 text-gray-300 hover:border-terminal-cyan hover:text-terminal-cyan transition-all font-bold rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={solutionsStore.loading}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-terminal-green to-terminal-cyan text-terminal-bg hover:shadow-2xl hover:shadow-terminal-green/50 transition-all font-bold rounded-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <UploadIcon size={20} />
              <span>{solutionsStore.loading ? 'Отправка...' : 'Отправить'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default observer(SubmitSolution);

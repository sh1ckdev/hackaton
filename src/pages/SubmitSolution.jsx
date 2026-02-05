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
    <div className="max-w-3xl">
      {/* Кнопка назад */}
      <button
        onClick={() => navigate(`/cases/${caseId}`)}
        className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-cyan mb-6 transition-colors group"
      >
        <ArrowLeftIcon size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>Назад к кейсу</span>
      </button>

      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <SolutionIcon size={28} className="text-terminal-green" />
          Отправить решение
        </h1>
        {casesStore.selectedCase && (
          <div className="mt-3 p-3 bg-terminal-dark/40 rounded-lg border border-terminal-gray/20">
            <p className="text-xs text-gray-500 mb-1">Кейс</p>
            <p className="text-gray-300 font-medium">{casesStore.selectedCase.title}</p>
          </div>
        )}
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm space-y-6">
          {/* Основная информация */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
              Название решения <span className="text-terminal-red">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-terminal-dark/60 border border-terminal-gray/30 text-white focus:border-terminal-green focus:outline-none rounded-lg transition-colors placeholder:text-gray-600"
              placeholder="Введите название решения"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-3 bg-terminal-dark/60 border border-terminal-gray/30 text-white focus:border-terminal-green focus:outline-none rounded-lg transition-colors resize-none placeholder:text-gray-600"
              placeholder="Опишите ваше решение, используемые технологии, подход и т.д."
            />
          </div>
        </div>

        {/* Ссылки */}
        <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm space-y-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Ссылки</h3>
          
          <div>
            <label htmlFor="github_url" className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <GitHubIcon size={16} className="text-gray-400" />
              Ссылка на GitHub репозиторий <span className="text-terminal-red">*</span>
            </label>
            <input
              type="url"
              id="github_url"
              name="github_url"
              value={formData.github_url}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-terminal-dark/60 border border-terminal-gray/30 text-white focus:border-terminal-green focus:outline-none rounded-lg transition-colors placeholder:text-gray-600"
              placeholder="https://github.com/username/repo"
            />
            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-terminal-green shrink-0"></span>
              <span>Обязательно укажите ссылку на ваш GitHub репозиторий</span>
            </p>
          </div>

          <div>
            <label htmlFor="demo_url" className="block text-sm font-semibold text-white mb-2">
              Ссылка на демо
            </label>
            <input
              type="url"
              id="demo_url"
              name="demo_url"
              value={formData.demo_url}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-terminal-dark/60 border border-terminal-gray/30 text-white focus:border-terminal-cyan focus:outline-none rounded-lg transition-colors placeholder:text-gray-600"
              placeholder="https://your-demo.com"
            />
            <p className="mt-2 text-xs text-gray-500">Опционально</p>
          </div>
        </div>

        {/* Файлы */}
        <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
          <label htmlFor="presentation" className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <UploadIcon size={16} className="text-gray-400" />
            Презентация (PDF, PPT, PPTX, ODP)
          </label>
          <input
            type="file"
            id="presentation"
            name="presentation"
            onChange={(e) => setPresentationFile(e.target.files[0])}
            accept=".pdf,.ppt,.pptx,.odp"
            className="w-full px-4 py-3 bg-terminal-dark/60 border border-terminal-gray/30 text-white rounded-lg file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:bg-terminal-gray/40 file:text-white file:cursor-pointer file:rounded file:hover:bg-terminal-gray/50 cursor-pointer transition-colors"
          />
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-terminal-cyan shrink-0"></span>
            <span>Максимальный размер: 100MB. Презентация опциональна.</span>
          </p>
        </div>

        {/* Ошибки */}
        {(error || solutionsStore.error) && (
          <div className="p-4 border border-terminal-red/50 rounded-xl text-terminal-red text-sm bg-terminal-red/10 backdrop-blur-sm">
            {error || solutionsStore.error}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center justify-between pt-4 border-t border-terminal-gray/30">
          <button
            type="button"
            onClick={() => navigate(`/cases/${caseId}`)}
            className="px-5 py-2.5 border border-terminal-gray/30 text-gray-300 hover:border-terminal-cyan hover:text-terminal-cyan transition-colors rounded-lg text-sm font-medium"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={solutionsStore.loading}
            className="px-6 py-2.5 bg-terminal-green text-terminal-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {solutionsStore.loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Отправка...</span>
              </>
            ) : (
              <>
                <UploadIcon size={16} />
                <span>Отправить</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default observer(SubmitSolution);

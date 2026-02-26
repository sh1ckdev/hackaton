import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import solutionsStore from '../stores/solutionsStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { UploadIcon, GitHubIcon, ArrowLeftIcon, PaperPlaneIcon, SolutionIcon, EditIcon } from '../components/Icons';

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
      setError('Укажите название решения');
      return;
    }
    if (!formData.github_url) {
      setError('Ссылка на GitHub репозиторий обязательна');
      return;
    }
    if (!presentationFile) {
      setError('Загрузите презентацию');
      return;
    }
    try {
      await solutionsStore.submitSolution(formData, presentationFile);
      navigate('/solutions');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка отправки решения');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (casesStore.loading) {
    return (
      <div className="solutions-page">
        <Link to="/solutions" className="submit-solution-back">
          <ArrowLeftIcon size={18} />
          Назад к решениям
        </Link>
        <div className="terminal-loading">
          <div className="terminal-loading-container">
            <div>
              <span className="terminal-loading-prompt">sys@hackathon:~$</span>
              <span className="terminal-loading-command">load_solution_form</span>
            </div>
            <div className="terminal-loading-status">
              &gt; Загрузка данных
              <span className="terminal-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
            <div className="terminal-loading-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!caseItem && !casesStore.loading) {
    return (
      <div className="solutions-page">
        <Link to="/solutions" className="submit-solution-back">
          <ArrowLeftIcon size={18} />
          Назад к решениям
        </Link>
        <div className="solutions-error">
          <p>{casesStore.error || 'Кейс не найден'}</p>
        </div>
      </div>
    );
  }

  const displayError = error || solutionsStore.error;

  return (
    <div className="solutions-page">
      <Link to="/solutions" className="submit-solution-back">
        <ArrowLeftIcon size={18} />
        Назад к решениям
      </Link>

      <header className="submit-solution-header">
        <div className="solutions-header-text">
          <h1>ОТПРАВИТЬ РЕШЕНИЕ</h1>
          <p>// Заполните форму. GitHub и презентация обязательны.</p>
        </div>
        {caseItem && (
          <div className="submit-solution-corner-badge">
            <SolutionIcon size={20} />
            <span>{caseItem.title}</span>
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className="submit-solution-form submit-solution-form-grid">
        <div className="submit-form-left">
        <div className="submit-form-section">
          <div className="submit-form-section-icon">
            <EditIcon size={32} />
          </div>
          <h3 className="submit-form-section-title">Основная информация</h3>
          <div className="submit-form-field">
            <label htmlFor="title" className="submit-form-label">
              Название решения <span className="submit-form-label-required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="submit-form-input"
              placeholder="Например: Мобильное приложение для доставки"
            />
          </div>
          <div className="submit-form-field">
            <label htmlFor="description" className="submit-form-label">Описание</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="submit-form-textarea"
              placeholder="Опишите решение: технологии, подход, идеи..."
            />
          </div>
        </div>
        </div>

        <div className="submit-form-right">
        <div className="submit-form-section">
          <div className="submit-form-section-icon">
            <GitHubIcon size={32} />
          </div>
          <h3 className="submit-form-section-title">Ссылки</h3>
          <div className="submit-form-field">
            <label htmlFor="github_url" className="submit-form-label">
              GitHub репозиторий <span className="submit-form-label-required">*</span>
            </label>
            <input
              type="url"
              id="github_url"
              name="github_url"
              value={formData.github_url}
              onChange={handleChange}
              required
              className="submit-form-input"
              placeholder="https://github.com/username/repo"
            />
            <p className="submit-form-hint">Обязательное поле. Укажите ссылку на репозиторий с кодом.</p>
          </div>
          <div className="submit-form-field">
            <label htmlFor="demo_url" className="submit-form-label">Демо или сайт</label>
            <input
              type="url"
              id="demo_url"
              name="demo_url"
              value={formData.demo_url}
              onChange={handleChange}
              className="submit-form-input"
              placeholder="https://your-demo.com (необязательно)"
            />
          </div>
        </div>

        <div className="submit-form-section">
          <div className="submit-form-section-icon">
            <UploadIcon size={32} />
          </div>
          <h3 className="submit-form-section-title">
            Презентация <span className="submit-form-label-required">*</span>
          </h3>
          <div className="submit-form-field">
            <div className="submit-form-file-wrap">
              <input
                type="file"
                id="presentation"
                name="presentation"
                onChange={(e) => setPresentationFile(e.target.files?.[0] || null)}
                accept=".pdf,.ppt,.pptx,.odp"
                required
              />
            </div>
            <p className="submit-form-hint">PDF, PPT, PPTX или ODP. Максимум 100 МБ. Обязательно.</p>
          </div>
        </div>
        </div>

        <div className="submit-form-actions-wrap">
        {displayError && (
          <div className="solutions-error">
            <p>{displayError}</p>
          </div>
        )}

        <div className="submit-form-actions">
          <button
            type="submit"
            disabled={solutionsStore.loading}
            className="submit-form-btn-submit"
          >
            {solutionsStore.loading ? (
              <>
                <span className="submit-form-spinner">⏳</span>
                Отправка...
              </>
            ) : (
              <>
                <PaperPlaneIcon size={18} />
                Отправить решение
              </>
            )}
          </button>
        </div>
        </div>
      </form>
    </div>
  );
};

export default observer(SubmitSolution);

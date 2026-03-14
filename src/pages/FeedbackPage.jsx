import { useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import api from '../utils/api';

const CATEGORIES = [
  { value: 'competitions', label: 'Соревнования и кейсы' },
  { value: 'site', label: 'Сайт и платформа' },
  { value: 'general', label: 'Общие пожелания' },
];

const FeedbackPage = () => {
  useDocumentTitle('Обратная связь');
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) {
      setError('Напишите, пожалуйста, ваш отзыв');
      return;
    }
    setSending(true);
    try {
      await api.post('/feedback', {
        category,
        rating: rating ? parseInt(rating, 10) : null,
        text: text.trim(),
      });
      setSent(true);
      setText('');
      setRating('');
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось отправить. Попробуйте позже.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="px-4 py-8" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="profile-card" style={{ padding: '32px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Спасибо за отзыв!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
            Ваше мнение помогает нам становиться лучше.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="admin-btn-secondary"
          >
            Отправить ещё один отзыв
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="profile-card" style={{ padding: '28px 32px 36px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
          Обратная связь
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          Расскажите, что вам понравилось, а что можно улучшить — в соревнованиях, на сайте, в организации. Ваши пожелания и замечания очень важны.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group" style={{ marginBottom: 20 }}>
            <label>О чём отзыв?</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="admin-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group" style={{ marginBottom: 20 }}>
            <label>Оценка (по желанию, 1–5)</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="admin-input"
            >
              <option value="">— не выбрано —</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? '— плохо' : n === 5 ? '— отлично' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group" style={{ marginBottom: 24 }}>
            <label>Ваш отзыв, пожелания, недоработки *</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="admin-input"
              rows={5}
              placeholder="Что можно улучшить? Что понравилось? Какие есть недоработки?"
              required
              style={{ resize: 'vertical', minHeight: 120 }}
            />
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="admin-btn-primary"
          >
            {sending ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPage;

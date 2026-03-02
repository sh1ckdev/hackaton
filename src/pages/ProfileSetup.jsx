import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import authStore from '../stores/authStore';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ProfileSetup = () => {
  useDocumentTitle('Заполнение профиля');
  const navigate = useNavigate();
  const user = authStore.user;

  const initialCategory = useMemo(() => {
    const value = user?.participant_category;
    return value === 'student' || value === 'school' ? value : '';
  }, [user?.participant_category]);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [middleName, setMiddleName] = useState(user?.middle_name || '');
  const [participantCategory, setParticipantCategory] = useState(initialCategory);
  const [institution, setInstitution] = useState(user?.institution || '');
  const [schoolName, setSchoolName] = useState(user?.school_name || '');
  const [schoolClass, setSchoolClass] = useState(user?.school_class || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authStore.isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (authStore.hasRequiredProfileData) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setSaving(true);
    try {
      await api.put('/profile/required-fields', {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        participant_category: participantCategory,
        institution,
        school_name: schoolName,
        school_class: schoolClass
      });
      await authStore.fetchUser();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось сохранить данные профиля');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="login-surface">
      <div className="login-terminal profile-setup-terminal">
        <div className="login-terminal-header">
          <div className="login-terminal-title">profile_setup.sh</div>
        </div>
        <div className="login-terminal-body">
          <div className="login-auth-title">Заполните обязательные данные профиля</div>
          <form className="profile-setup-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="profile-setup-input"
              placeholder="Фамилия"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="text"
              className="profile-setup-input"
              placeholder="Имя"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              className="profile-setup-input"
              placeholder="Отчество"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              required
            />

            <div className="login-category-block">
              <label className="login-category-label">Я участник:</label>
              <label className="login-category-option">
                <input
                  type="radio"
                  name="participant_category"
                  value="student"
                  checked={participantCategory === 'student'}
                  onChange={(e) => setParticipantCategory(e.target.value)}
                />
                <span>Студент</span>
              </label>
              <label className="login-category-option">
                <input
                  type="radio"
                  name="participant_category"
                  value="school"
                  checked={participantCategory === 'school'}
                  onChange={(e) => setParticipantCategory(e.target.value)}
                />
                <span>Школьник</span>
              </label>
            </div>

            {participantCategory === 'student' && (
              <input
                type="text"
                className="profile-setup-input"
                placeholder="Институт / колледж / вуз"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
            )}

            {participantCategory === 'school' && (
              <>
                <input
                  type="text"
                  className="profile-setup-input"
                  placeholder="Школа"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="profile-setup-input"
                  placeholder="Класс (например, 10А)"
                  value={schoolClass}
                  onChange={(e) => setSchoolClass(e.target.value)}
                  required
                />
              </>
            )}

            {error && <div className="login-error"><span>{error}</span></div>}

            <button type="submit" className="login-telegram-button" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить и продолжить'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default observer(ProfileSetup);

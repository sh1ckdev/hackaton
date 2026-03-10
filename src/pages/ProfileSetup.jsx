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
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [participantCategory, setParticipantCategory] = useState(initialCategory);
  const [studentCourse, setStudentCourse] = useState(user?.student_course || '');
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
  }, [navigate]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setMiddleName(user.middle_name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      const cat = user.participant_category === 'student' || user.participant_category === 'school' ? user.participant_category : '';
      setParticipantCategory(cat);
      setStudentCourse(user.student_course || '');
      setInstitution(user.institution || '');
      setSchoolName(user.school_name || '');
      setSchoolClass(user.school_class || '');
    }
  }, [user?.id, user?.first_name, user?.last_name, user?.middle_name, user?.phone, user?.email, user?.participant_category, user?.student_course, user?.institution, user?.school_name, user?.school_class]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setSaving(true);
    const wasFirstTime = !authStore.hasRequiredProfileData;
    try {
      await api.put('/profile/required-fields', {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone,
        email,
        participant_category: participantCategory,
        student_course: studentCourse,
        institution,
        school_name: schoolName,
        school_class: schoolClass
      });
      await authStore.fetchUser();
      navigate(wasFirstTime ? '/' : '/profile', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось сохранить данные профиля');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="login-surface profile-setup-surface">
      <div className="login-terminal profile-setup-terminal">
        <div className="login-terminal-header">
          <div className="login-terminal-title">profile_setup.sh</div>
        </div>
        <div className="login-terminal-body">
          <div className="login-auth-title">
            {authStore.hasRequiredProfileData ? 'Редактировать данные профиля' : 'Заполните обязательные данные профиля'}
          </div>
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
            <input
              type="tel"
              className="profile-setup-input"
              placeholder="Номер телефона"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <input
              type="email"
              className="profile-setup-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <>
                <input
                  type="text"
                  className="profile-setup-input"
                  placeholder="Курс (например, 2)"
                  value={studentCourse}
                  onChange={(e) => setStudentCourse(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="profile-setup-input"
                  placeholder="Институт / колледж / вуз"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required
                />
              </>
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

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="submit" className="login-telegram-button" disabled={saving}>
                {saving ? 'Сохраняем...' : (authStore.hasRequiredProfileData ? 'Сохранить изменения' : 'Сохранить и продолжить')}
              </button>
              {authStore.hasRequiredProfileData && (
                <button type="button" onClick={() => navigate('/profile')} className="login-telegram-button" style={{ background: 'transparent', border: '1px solid rgba(148,163,184,0.4)' }}>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default observer(ProfileSetup);

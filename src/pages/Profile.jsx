import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EditIcon, RefreshIcon } from '../components/Icons';
import api from '../utils/api';
import SupportChat from '../components/SupportChat';

const Profile = () => {
  const user = authStore.user;
  useDocumentTitle('Профиль');
  const [showSupport, setShowSupport] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsList, setSkillsList] = useState([]);
  const [newLangName, setNewLangName] = useState('');
  const [newLangExtension, setNewLangExtension] = useState('');
  const [newFrameworkName, setNewFrameworkName] = useState('');

  useEffect(() => {
    if (user) {
      setSkillsList(user.skills || []);
    }
  }, [user]);

  const handleResync = async () => {
    try {
      await api.post('/profile/resync');
      await authStore.fetchUser();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка синхронизации');
    }
  };

  const handleEditSkills = () => {
    setEditingSkills(true);
    setSkillsList(user?.skills ? [...user.skills] : []);
  };

  const handleCancelSkills = () => {
    setEditingSkills(false);
    setSkillsList(user?.skills || []);
    setNewLangName('');
    setNewLangExtension('');
    setNewFrameworkName('');
  };

  const handleAddLanguage = () => {
    if (!newLangName.trim()) return;
    const skill = {
      name: newLangName.trim(),
      type: 'language',
      extension: newLangExtension.trim() || null
    };
    setSkillsList([...skillsList, skill]);
    setNewLangName('');
    setNewLangExtension('');
  };

  const handleAddFramework = () => {
    if (!newFrameworkName.trim()) return;
    const skill = {
      name: newFrameworkName.trim(),
      type: 'framework',
      extension: null
    };
    setSkillsList([...skillsList, skill]);
    setNewFrameworkName('');
  };

  const handleRemoveSkill = (index) => {
    setSkillsList(skillsList.filter((_, i) => i !== index));
  };

  const handleSaveSkills = async () => {
    try {
      const response = await api.put('/profile/skills', { skills: skillsList });
      // Обновляем пользователя через fetchUser для правильной работы с MobX
      await authStore.fetchUser();
      setEditingSkills(false);
    } catch (error) {
      console.error('Ошибка сохранения навыков:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения навыков');
    }
  };

  const isVkUser = Boolean(user?.vk_id);
  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.first_name || user?.last_name || user?.username || 'Пользователь';

  const skills = editingSkills ? skillsList : (user?.skills || []);
  const languages = skills.filter(s => s.type === 'language') || [];
  const frameworks = skills.filter(s => s.type === 'framework') || [];

  return (
    <div className="profile-page">
      <div className="profile-grid">
        <div className="profile-left">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {user?.photo_url ? (
                  <img src={user.photo_url} alt={user.username} />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-name-section">
                <h1 className="profile-name-row">
                  <span className="profile-name">{displayName}</span>
                  <span className="profile-username">
                    {isVkUser ? (
                      <a href={`https://vk.com/id${user.vk_id}`} target="_blank" rel="noopener noreferrer" className="profile-vk-link">
                        vk.com/id{user.vk_id}
                      </a>
                    ) : (
                      `@${user?.username || 'user'}`
                    )}
                  </span>
                </h1>
                {user?.user_code && (
                  <div className="profile-user-id">
                    Код: <span className="profile-user-id-value">{user.user_code}</span>
                    <button
                      type="button"
                      className="profile-user-id-copy"
                      onClick={() => navigator.clipboard.writeText(String(user.user_code))}
                    >
                      Копировать
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-actions">
              <button onClick={handleResync} className="profile-btn profile-btn-primary">
                <RefreshIcon size={16} />
                Обновить данные
              </button>
              <button onClick={() => setShowSupport(true)} className="profile-btn profile-btn-support">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                Поддержка
              </button>
            </div>

          </div>
        </div>

        <div className="profile-right">
          <div className="profile-skills">
            <div className="profile-skills-header">
              <span className="profile-skills-prompt">user@mainframe:~/skills</span>
              {!editingSkills ? (
                <button onClick={handleEditSkills} className="profile-skills-edit-btn">
                  <EditIcon size={14} />
                </button>
              ) : (
                <div className="profile-skills-actions">
                  <button onClick={handleSaveSkills} className="profile-skills-save-btn" title="Сохранить">
                    ✓ Сохранить
                  </button>
                  <button onClick={handleCancelSkills} className="profile-skills-cancel-btn" title="Отмена">
                    × Отмена
                  </button>
                </div>
              )}
            </div>
            <div className="profile-skills-terminal">
              {editingSkills ? (
                <div className="profile-skills-edit-grid">
                  <div className="profile-skills-column">
                    <div className="profile-skills-line">
                      <span className="profile-skills-command">root@{user?.username || 'user'}:~$</span>
                      <span> ls -la ./languages</span>
                    </div>
                    <div className="profile-skills-tags">
                      {languages.length > 0 ? (
                        languages.map((skill, idx) => {
                          const skillIndex = skillsList.findIndex(s => 
                            s.name === skill.name && 
                            s.type === skill.type && 
                            s.extension === skill.extension
                          );
                          return (
                            <span key={idx} className="profile-skill-tag profile-skill-tag-editable">
                              {skill.name}{skill.extension ? `.${skill.extension}` : ''}
                              <button type="button" onClick={() => handleRemoveSkill(skillIndex)} className="profile-skill-tag-remove" aria-label="Удалить">
                                ×
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <span className="profile-skills-empty">Нет языков программирования</span>
                      )}
                    </div>
                    <div className="profile-skills-add">
                      <div className="profile-skills-add-form">
                        <span className="profile-skills-add-label">Язык:</span>
                        <input
                          type="text"
                          placeholder="JavaScript, Python…"
                          value={newLangName}
                          onChange={(e) => setNewLangName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                          className="profile-skills-add-input"
                        />
                        <input
                          type="text"
                          placeholder=".js"
                          value={newLangExtension}
                          onChange={(e) => setNewLangExtension(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                          className="profile-skills-add-ext"
                          title="Расширение файла"
                        />
                        <button type="button" onClick={handleAddLanguage} className="profile-skills-add-btn">
                          Добавить
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="profile-skills-column">
                    <div className="profile-skills-line">
                      <span className="profile-skills-command">root@{user?.username || 'user'}:~$</span>
                      <span> ./show-frameworks.sh</span>
                    </div>
                    <div className="profile-skills-tags">
                      {frameworks.length > 0 ? (
                        frameworks.map((skill, idx) => {
                          const skillIndex = skillsList.findIndex(s => 
                            s.name === skill.name && 
                            s.type === skill.type && 
                            s.extension === skill.extension
                          );
                          return (
                            <span key={idx} className="profile-skill-tag profile-skill-tag-editable">
                              {skill.name}
                              <button type="button" onClick={() => handleRemoveSkill(skillIndex)} className="profile-skill-tag-remove" aria-label="Удалить">
                                ×
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <span className="profile-skills-empty">Нет фреймворков</span>
                      )}
                    </div>
                    <div className="profile-skills-add">
                      <div className="profile-skills-add-form">
                        <span className="profile-skills-add-label">Фреймворк:</span>
                        <input
                          type="text"
                          placeholder="React, Vue, Express…"
                          value={newFrameworkName}
                          onChange={(e) => setNewFrameworkName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddFramework()}
                          className="profile-skills-add-input"
                        />
                        <button type="button" onClick={handleAddFramework} className="profile-skills-add-btn">
                          Добавить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="profile-skills-line">
                    <span className="profile-skills-command">root@{user?.username || 'user'}:~$</span>
                    <span> ls -la ./languages</span>
                  </div>
                  <div className="profile-skills-tags">
                    {languages.length > 0 ? (
                      languages.map((skill, idx) => (
                        <span key={idx} className="profile-skill-tag">{skill.name}{skill.extension ? `.${skill.extension}` : ''}</span>
                      ))
                    ) : (
                      <span className="profile-skills-empty">Нет языков программирования</span>
                    )}
                  </div>
                  <div className="profile-skills-line">
                    <span className="profile-skills-command">root@{user?.username || 'user'}:~$</span>
                    <span> ./show-frameworks.sh</span>
                  </div>
                  <div className="profile-skills-tags">
                    {frameworks.length > 0 ? (
                      frameworks.map((skill, idx) => (
                        <span key={idx} className="profile-skill-tag">{skill.name}</span>
                      ))
                    ) : (
                      <span className="profile-skills-empty">Нет фреймворков</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSupport && <SupportChat onClose={() => setShowSupport(false)} />}
    </div>
  );
};

export default observer(Profile);

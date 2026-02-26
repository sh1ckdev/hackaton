import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EditIcon, RefreshIcon } from '../components/Icons';
import api from '../utils/api';
const Profile = () => {
  const user = authStore.user;
  useDocumentTitle('Профиль');
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsList, setSkillsList] = useState([]);
  const [newLangName, setNewLangName] = useState('');
  const [newFrameworkName, setNewFrameworkName] = useState('');

  // Назначенный кейс команды
  const [assignedCase, setAssignedCase] = useState(null);

  // Easter egg: счётчик кликов по аватарке
  const avatarClickCount = useRef(0);

  useEffect(() => {
    if (user) {
      setSkillsList(user.skills || []);
    }
  }, [user]);

  useEffect(() => {
    api.get('/teams/me').then(res => {
      const team = res.data?.team;
      if (team?.assigned_case_id) {
        api.get(`/cases/${team.assigned_case_id}`).then(r => {
          setAssignedCase(r.data?.case || null);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const handleAvatarClick = () => {
    avatarClickCount.current += 1;
    if (avatarClickCount.current >= 20) {
      avatarClickCount.current = 0;
      window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
    }
  };

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
    };
    setSkillsList([...skillsList, skill]);
    setNewLangName('');
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
              <div className="profile-avatar" onClick={handleAvatarClick} style={{ cursor: 'pointer' }} title="">
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
                        <input
                          type="text"
                          placeholder="JavaScript, Python…"
                          value={newLangName}
                          onChange={(e) => setNewLangName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                          className="profile-skills-add-input"
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

          {assignedCase && (
            <div className="profile-assigned-case">
              <div className="profile-assigned-case-label">
                <span className="profile-skills-prompt">user@mainframe:~/case</span>
                {assignedCase.participant_category && (
                  <span className="profile-assigned-case-badge">
                    {assignedCase.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                  </span>
                )}
              </div>
              <div className="profile-assigned-case-body">
                <div className="profile-assigned-case-title">{assignedCase.title}</div>
                {assignedCase.description && (
                  <div className="profile-assigned-case-desc">{assignedCase.description}</div>
                )}
                {assignedCase.requirements && (
                  <div className="profile-assigned-case-requirements">
                    <div className="profile-assigned-case-section-title">Требования</div>
                    <div className="profile-assigned-case-requirements-text">{assignedCase.requirements}</div>
                  </div>
                )}
                {Array.isArray(assignedCase.links) && assignedCase.links.length > 0 && (
                  <div className="profile-assigned-case-links">
                    <div className="profile-assigned-case-section-title">Ссылки</div>
                    <div className="profile-assigned-case-links-list">
                      {assignedCase.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-assigned-case-link"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          {link.label || link.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(assignedCase.attachments) && assignedCase.attachments.length > 0 && (
                  <div className="profile-assigned-case-files">
                    <div className="profile-assigned-case-section-title">Файлы</div>
                    <div className="profile-assigned-case-files-list">
                      {assignedCase.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-assigned-case-file"
                          download={att.name}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                            <polyline points="13 2 13 9 20 9"/>
                          </svg>
                          {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default observer(Profile);

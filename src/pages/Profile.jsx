import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EditIcon, RefreshIcon } from '../components/Icons';
import api from '../utils/api';

const Profile = () => {
  const user = authStore.user;
  useDocumentTitle('Профиль');
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsList, setSkillsList] = useState([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillType, setNewSkillType] = useState('language');
  const [newSkillExtension, setNewSkillExtension] = useState('');

  useEffect(() => {
    if (user) {
      setBioText(user.bio || '');
      setSkillsList(user.skills || []);
    }
  }, [user]);

  const handleEditBio = () => {
    setEditingBio(true);
    setBioText(user?.bio || '');
  };

  const handleSaveBio = async () => {
    try {
      const response = await api.put('/profile/bio', { bio: bioText });
      // Обновляем пользователя через fetchUser для правильной работы с MobX
      await authStore.fetchUser();
      setEditingBio(false);
    } catch (error) {
      console.error('Ошибка сохранения био:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения био');
    }
  };

  const handleCancelBio = () => {
    setEditingBio(false);
    setBioText(user?.bio || '');
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
    setNewSkillName('');
    setNewSkillExtension('');
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const skill = {
      name: newSkillName.trim(),
      type: newSkillType,
      extension: newSkillType === 'language' ? newSkillExtension.trim() : null
    };
    setSkillsList([...skillsList, skill]);
    setNewSkillName('');
    setNewSkillExtension('');
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

  const bio = bioText || user?.bio || '';
  
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
                <div className="profile-status-dot"></div>
              </div>
              <div className="profile-name-section">
                <h1 className="profile-name">{displayName}</h1>
                <div className="profile-username">
                  {isVkUser ? (
                    <a href={`https://vk.com/id${user.vk_id}`} target="_blank" rel="noopener noreferrer" className="profile-vk-link">
                      vk.com/id{user.vk_id}
                    </a>
                  ) : (
                    `@${user?.username || 'user'}`
                  )}
                </div>
                {(user?.email || user?.phone) && (
                  <div className="profile-contact">
                    {user?.email && <span>{user.email}</span>}
                    {user?.email && user?.phone && <span className="profile-contact-sep"> · </span>}
                    {user?.phone && <span>{user.phone}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="profile-bio-section">
              <div className="profile-bio-label">$ cat bio.txt</div>
              {editingBio ? (
                <div className="profile-bio-edit">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    className="profile-bio-textarea"
                    rows={3}
                  />
                  <div className="profile-bio-edit-actions">
                    <button onClick={handleSaveBio} className="profile-bio-save">
                      Сохранить
                    </button>
                    <button onClick={handleCancelBio} className="profile-bio-cancel">
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-bio-content">
                  {bio || <span style={{ opacity: 0.5 }}>Нажмите Edit, чтобы добавить описание</span>}
                  <span className="profile-bio-cursor">▍</span>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button onClick={handleEditBio} className="profile-btn profile-btn-primary">
                <EditIcon size={16} />
                Редактировать
              </button>
              <button onClick={handleResync} className="profile-btn profile-btn-secondary">
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSaveSkills} className="profile-skills-edit-btn" style={{ color: '#22c55e' }}>
                    ✓
                  </button>
                  <button onClick={handleCancelSkills} className="profile-skills-edit-btn" style={{ color: '#f87171' }}>
                    ×
                  </button>
                </div>
              )}
            </div>
            <div className="profile-skills-terminal">
              {editingSkills ? (
                <>
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
                          <span key={idx} className="profile-skill-tag" style={{ position: 'relative', paddingRight: '20px' }}>
                            {skill.name}{skill.extension ? `.${skill.extension}` : ''}
                            <button
                              onClick={() => handleRemoveSkill(skillIndex)}
                              style={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(248, 113, 113, 0.2)',
                                border: '1px solid rgba(248, 113, 113, 0.4)',
                                borderRadius: '4px',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: '12px',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ opacity: 0.5, fontSize: '12px' }}>Нет языков программирования</span>
                    )}
                  </div>
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
                          <span key={idx} className="profile-skill-tag" style={{ position: 'relative', paddingRight: '20px' }}>
                            {skill.name}
                            <button
                              onClick={() => handleRemoveSkill(skillIndex)}
                              style={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(248, 113, 113, 0.2)',
                                border: '1px solid rgba(248, 113, 113, 0.4)',
                                borderRadius: '4px',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: '12px',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ opacity: 0.5, fontSize: '12px' }}>Нет фреймворков</span>
                    )}
                  </div>
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: 'rgba(226, 232, 240, 0.7)' }}>Добавить новый навык:</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Название навыка"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                        style={{
                          flex: '1',
                          minWidth: '150px',
                          padding: '6px 10px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.3)',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '12px'
                        }}
                      />
                      <select
                        value={newSkillType}
                        onChange={(e) => setNewSkillType(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.3)',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '12px'
                        }}
                      >
                        <option value="language">Язык</option>
                        <option value="framework">Фреймворк</option>
                      </select>
                      {newSkillType === 'language' && (
                        <input
                          type="text"
                          placeholder="Расширение (js, ts, py)"
                          value={newSkillExtension}
                          onChange={(e) => setNewSkillExtension(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                          style={{
                            width: '120px',
                            padding: '6px 10px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '6px',
                            color: '#e2e8f0',
                            fontSize: '12px'
                          }}
                        />
                      )}
                      <button
                        onClick={handleAddSkill}
                        style={{
                          padding: '6px 12px',
                          background: '#22c55e',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        + Добавить
                      </button>
                    </div>
                  </div>
                </>
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
                      <span style={{ opacity: 0.5, fontSize: '12px' }}>Нет языков программирования</span>
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
                      <span style={{ opacity: 0.5, fontSize: '12px' }}>Нет фреймворков</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default observer(Profile);

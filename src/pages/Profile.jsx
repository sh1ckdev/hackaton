import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EditIcon, RefreshIcon } from '../components/Icons';
import api from '../utils/api';

const Profile = () => {
  const user = authStore.user;
  useDocumentTitle('Профиль');
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsList, setSkillsList] = useState([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillType, setNewSkillType] = useState('language');
  const [newSkillExtension, setNewSkillExtension] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (user?.bio) {
      setBioText(user.bio);
    }
    if (user?.skills) {
      setSkillsList(user.skills);
    }
  }, [user]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [statsRes, metricsRes] = await Promise.all([
        api.get('/profile/stats').catch(() => ({ data: null })),
        api.get('/profile/metrics').catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных профиля', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBio = () => {
    setEditingBio(true);
  };

  const handleSaveBio = async () => {
    try {
      await api.put('/profile/bio', { bio: bioText });
      await authStore.fetchUser();
      setEditingBio(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения био');
    }
  };

  const handleResync = async () => {
    try {
      await api.post('/profile/resync');
      await fetchProfileData();
      await authStore.fetchUser();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка синхронизации');
    }
  };

  const handleEditSkills = () => {
    setEditingSkills(true);
    setSkillsList(user?.skills || []);
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
      await api.put('/profile/skills', { skills: skillsList });
      await authStore.fetchUser();
      setEditingSkills(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка сохранения навыков');
    }
  };

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} "${user.username}" ${user.last_name}`
    : user?.first_name || user?.username || 'User';

  const bio = bioText || user?.bio || 'Full-stack developer obsessed with clean architecture and caffeine. Currently building decentralized solutions for better tomorrow.';
  
  const reputation = stats?.reputation || 0;
  const attendance = stats?.attendance || 0;
  const commits = metrics?.commits || 0;
  const commitsChange = metrics?.commits_change || 0;
  const hours = metrics?.hours || 0;
  const currentSession = metrics?.current_session || null;
  const rank = metrics?.rank || null;
  const rankPercentile = metrics?.rank_percentile || null;
  const skills = user?.skills || [];
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
                <div className="profile-username">@{user?.username || 'username'}</div>
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
                    <button onClick={handleSaveBio} className="profile-bio-save">Save</button>
                    <button onClick={() => { setEditingBio(false); setBioText(user?.bio || ''); }} className="profile-bio-cancel">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="profile-bio-content">
                  {bio}
                  <span className="profile-bio-cursor">▍</span>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button onClick={handleEditBio} className="profile-btn profile-btn-primary">
                <EditIcon size={16} />
                Edit
              </button>
              <button onClick={handleResync} className="profile-btn profile-btn-secondary">
                <RefreshIcon size={16} />
                Resync
              </button>
            </div>

            <div className="profile-stats">
              <h3 className="profile-stats-title">PLATFORM STATS</h3>
              <div className="profile-stat-item">
                <div className="profile-stat-header">
                  <span>Reputation</span>
                  <span className="profile-stat-value">{reputation.toLocaleString()} pts</span>
                </div>
                <div className="profile-progress-bar">
                  <div className="profile-progress-fill profile-progress-green" style={{ width: `${Math.min((reputation / 1200) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-header">
                  <span>Attendance</span>
                  <span className="profile-stat-value">{attendance}%</span>
                </div>
                <div className="profile-progress-bar">
                  <div className="profile-progress-fill profile-progress-blue" style={{ width: `${attendance}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-right">
          <div className="profile-metrics">
            <div className="profile-metric-card">
              <div className="profile-metric-label">COMMITS PUSHED</div>
              <div className="profile-metric-value">{loading ? '...' : commits.toLocaleString()}</div>
              {commitsChange > 0 && (
                <div className="profile-metric-change">↑ {commitsChange}% this week</div>
              )}
            </div>
            <div className="profile-metric-card">
              <div className="profile-metric-label">HOURS HACKED</div>
              <div className="profile-metric-value">{loading ? '...' : `${hours} h`}</div>
              {currentSession && (
                <div className="profile-metric-session">Ongoing Session: {currentSession}</div>
              )}
            </div>
            <div className="profile-metric-card">
              <div className="profile-metric-label">GLOBAL RANK</div>
              <div className="profile-metric-value">{loading ? '...' : rank ? `#${rank}` : '—'}</div>
              {rankPercentile && (
                <div className="profile-metric-session">Top {rankPercentile}% of hackers</div>
              )}
            </div>
          </div>

          <div className="profile-skills">
            <div className="profile-skills-header">
              <span className="profile-skills-prompt">user@mainframe:~/skills</span>
              <button onClick={handleEditSkills} className="profile-skills-edit-btn">
                <EditIcon size={14} />
              </button>
            </div>
            <div className="profile-skills-terminal">
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
                  <>
                    <span className="profile-skill-tag">JavaScript.js</span>
                    <span className="profile-skill-tag">TypeScript.ts</span>
                    <span className="profile-skill-tag">Python.py</span>
                  </>
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
                  <>
                    <span className="profile-skill-tag">React</span>
                    <span className="profile-skill-tag">Next.JS</span>
                    <span className="profile-skill-tag">TailwindCSS</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingSkills && (
        <div className="profile-skills-modal">
          <div className="profile-skills-modal-content">
            <h3>Edit Skills</h3>
            <div className="profile-skills-edit-list">
              {skillsList.map((skill, idx) => (
                <div key={idx} className="profile-skills-edit-item">
                  <span className="profile-skills-edit-item-name">
                    {skill.name}{skill.extension ? `.${skill.extension}` : ''}
                  </span>
                  <span className="profile-skills-edit-item-type">{skill.type}</span>
                  <button
                    onClick={() => handleRemoveSkill(idx)}
                    className="profile-skills-edit-item-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="profile-skills-edit-add">
              <input
                type="text"
                placeholder="Skill name"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                className="profile-skills-edit-input"
              />
              <select
                value={newSkillType}
                onChange={(e) => setNewSkillType(e.target.value)}
                className="profile-skills-edit-select"
              >
                <option value="language">Language</option>
                <option value="framework">Framework</option>
              </select>
              {newSkillType === 'language' && (
                <input
                  type="text"
                  placeholder="Extension (e.g., js, ts, py)"
                  value={newSkillExtension}
                  onChange={(e) => setNewSkillExtension(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="profile-skills-edit-input"
                />
              )}
              <button onClick={handleAddSkill} className="profile-skills-edit-add-btn">
                +
              </button>
            </div>
            <div className="profile-skills-edit-actions">
              <button onClick={handleSaveSkills} className="profile-btn profile-btn-primary">
                Save
              </button>
              <button
                onClick={() => {
                  setEditingSkills(false);
                  setSkillsList(user?.skills || []);
                }}
                className="profile-btn profile-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(Profile);

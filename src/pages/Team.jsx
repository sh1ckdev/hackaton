import { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import api from '../utils/api';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { FolderPlusIcon, LinkIcon, PlusIcon, TimeIcon, EditIcon } from '../components/Icons';
const Team = () => {
  useDocumentTitle('Команда');
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamNameError, setTeamNameError] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [teamCode, setTeamCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef([]);
  const [logs, setLogs] = useState([]);
  const [teamCodeCopied, setTeamCodeCopied] = useState(false);
  const [activeInviteSlot, setActiveInviteSlot] = useState(null);
  const [inviteUserCode, setInviteUserCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [invitePreview, setInvitePreview] = useState(null);
  const [invitePreviewLoading, setInvitePreviewLoading] = useState(false);
  const [confirmKickUserCode, setConfirmKickUserCode] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [deadlineLeft, setDeadlineLeft] = useState(null);

  useEffect(() => {
    api.get('/landing/deadline').then((res) => {
      setDeadlineDate(res.data?.target_date || null);
    }).catch(() => setDeadlineDate(null));
  }, []);

  useEffect(() => {
    if (!deadlineDate) return;
    const update = () => {
      const diff = new Date(deadlineDate) - new Date();
      if (diff <= 0) {
        setDeadlineLeft({ expired: true });
        return;
      }
      setDeadlineLeft({
        expired: false,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [deadlineDate]);

  const formatDeadline = () => {
    if (!deadlineLeft || deadlineLeft.expired) return 'Завершено';
    const { days, hours, minutes, seconds } = deadlineLeft;
    const totalHours = days * 24 + hours;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(totalHours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const isOnline = (lastActivityAt) => {
    if (!lastActivityAt) return false;
    const diff = (Date.now() - new Date(lastActivityAt).getTime()) / 1000;
    return diff < 120; // онлайн, если активность была менее 2 минут назад
  };

  const SPECIALTIES = [
    { value: 'fullstack', label: 'Фулстек' },
    { value: 'frontend', label: 'Фронтенд' },
    { value: 'backend', label: 'Бекенд' },
    { value: 'design', label: 'Дизайн' },
    { value: 'mobile', label: 'Мобильный' },
    { value: 'devops', label: 'Девопс' }
  ];

  const handleSpecialtyChange = async (specialty) => {
    try {
      await api.put('/teams/me/specialty', { specialty });
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка обновления');
    }
  };

  useEffect(() => {
    const fetchTeam = async () => {
      setLoadingTeam(true);
      setTeamError(null);
      try {
        const response = await api.get('/teams/me');
        setTeam(response.data.team);
        if (response.data.team) {
          generateLogs(response.data.team);
        }
      } catch (error) {
        setTeamError(error.response?.data?.error || 'Ошибка загрузки команды');
      } finally {
        setLoadingTeam(false);
      }
    };
    fetchTeam();
    const interval = setInterval(() => {
      api.get('/teams/me').then((res) => {
        if (res.data?.team) {
          setTeam(res.data.team);
          if (res.data.team) generateLogs(res.data.team);
        }
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const generateLogs = (teamData) => {
    const newLogs = [];
    if (teamData.members && teamData.members.length > 0) {
      const captain = teamData.members.find(m => m.role === 'captain');
      if (captain && teamData.created_at) {
        const createdDate = new Date(teamData.created_at);
        const timeStr = `${createdDate.getHours().toString().padStart(2, '0')}:${createdDate.getMinutes().toString().padStart(2, '0')}:${createdDate.getSeconds().toString().padStart(2, '0')}`;
        newLogs.push({
          time: timeStr,
          level: 'INFO',
          message: `User @${captain.username} initialized team repository '${teamData.name}'.`
        });
      }
      teamData.members.filter(m => m.role !== 'captain').forEach((member, idx) => {
        if (member.joined_at) {
          const joinedDate = new Date(member.joined_at);
          const timeStr = `${joinedDate.getHours().toString().padStart(2, '0')}:${joinedDate.getMinutes().toString().padStart(2, '0')}:${joinedDate.getSeconds().toString().padStart(2, '0')}`;
          newLogs.push({
            time: timeStr,
            level: 'SUCCESS',
            message: `User @${member.username} joined via hash key.`
          });
        } else {
          // Fallback если нет даты присоединения
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${(now.getMinutes() - idx * 3).toString().padStart(2, '0')}:${(now.getSeconds() - idx).toString().padStart(2, '0')}`;
          newLogs.push({
            time: timeStr,
            level: 'SUCCESS',
            message: `User @${member.username} joined via hash key.`
          });
        }
      });
    }
    if (teamData.members && teamData.members.length < 4) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      newLogs.push({
        time: timeStr,
        level: 'SYSTEM',
        message: 'Waiting for final member configuration...'
      });
    }
    // Сортируем логи по времени
    newLogs.sort((a, b) => a.time.localeCompare(b.time));
    setLogs(newLogs);
  };

  const handleCodeChange = (index, value) => {
    // Если вставлен длинный код (например, через Ctrl+V)
    if (value.length > 1) {
      const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const newCode = ['', '', '', '', '', ''];
      for (let i = 0; i < cleanValue.length && i < 6; i++) {
        newCode[i] = cleanValue[i];
      }
      setTeamCode(newCode);
      // Фокус на последний заполненный или следующий пустой
      const nextEmptyIndex = cleanValue.length < 6 ? cleanValue.length : 5;
      codeInputRefs.current[nextEmptyIndex]?.focus();
      return;
    }

    // Обычный ввод одного символа
    const newCode = [...teamCode];
    newCode[index] = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setTeamCode(newCode);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !teamCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setTeamCode(newCode);
    const nextEmptyIndex = pastedData.length < 6 ? pastedData.length : 5;
    codeInputRefs.current[nextEmptyIndex]?.focus();
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = teamCode.join('').trim();
    if (code.length !== 6) {
      setTeamError('Код должен состоять из 6 символов');
      return;
    }
    try {
      await api.post('/teams/join', { team_code: code });
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      setTeamCode(['', '', '', '', '', '']);
      setTeamError(null);
      generateLogs(teamResponse.data.team);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка вступления в команду');
    }
  };

  const handleInviteByUserCode = async (e) => {
    e.preventDefault();
    const code = inviteUserCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) {
      setInviteError('Введите 6-значный код (буквы и цифры)');
      return;
    }
    setInviteError('');
    try {
      await api.post('/teams/invite', { user_code: code });
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      setActiveInviteSlot(null);
      setInviteUserCode('');
      setInvitePreview(null);
      generateLogs(teamResponse.data.team);
    } catch (error) {
      setInviteError(error.response?.data?.error || 'Ошибка приглашения');
    }
  };

  const fetchInvitePreview = async () => {
    const code = inviteUserCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return;
    setInviteError('');
    setInvitePreview(null);
    setInvitePreviewLoading(true);
    try {
      const res = await api.get(`/teams/preview-invite/${code}`);
      setInvitePreview(res.data.user);
    } catch (error) {
      setInvitePreview(null);
      setInviteError(error.response?.data?.error || 'Пользователь не найден');
    } finally {
      setInvitePreviewLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Вы уверены, что хотите выйти из команды?')) return;
    try {
      await api.post('/teams/leave');
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      setTeamError(null);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка выхода');
    }
  };

  const handleKick = async (userCode) => {
    try {
      await api.post('/teams/kick', { user_code: userCode });
      setConfirmKickUserCode(null);
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      generateLogs(teamResponse.data.team);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleCreate = async () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setTeamNameError(true);
      return;
    }
    setTeamNameError(false);
    setCreateError(null);
    try {
      await api.post('/teams/create', { name: trimmedName });
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      setTeamName('');
      setTeamError(null);
      setCreateError(null);
      generateLogs(teamResponse.data.team);
    } catch (error) {
      const msg = error.response?.data?.error || 'Ошибка создания команды';
      setCreateError(msg);
    }
  };

  const maxMembers = 4;
  const currentMembers = team?.members || [];
  const emptySlots = Array(maxMembers - currentMembers.length).fill(null);

  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <h1>Управление командой{team?.name ? `: ${team.name}` : ''}</h1>
          <p>Управляйте своим составом, приглашайте участников или присоединяйтесь к существующей команде.</p>
        </div>
        <div className="team-deadline">
          <TimeIcon size={16} />
          <span>ДЕДЛАЙН: {deadlineDate ? formatDeadline() : '—'}</span>
        </div>
      </div>

      {loadingTeam ? (
        <div className="terminal-loading">
          <div className="terminal-loading-container">
            <div>
              <span className="terminal-loading-prompt">sys@hackathon:~$</span>
              <span className="terminal-loading-command">team_status --current</span>
            </div>
            <div className="terminal-loading-status">
              &gt; Fetching team data
              <span className="terminal-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
            <div className="terminal-loading-bar"></div>
          </div>
        </div>
      ) : team ? (
        <>
          <h2 className="team-section-title">
            Текущий состав [{currentMembers.length}/{maxMembers}]
          </h2>
          <div className="team-main-row">
          <div className="team-members-section">
            <div className="team-members-grid">
              {currentMembers.map((member) => {
                const captain = currentMembers.find(m => m.role === 'captain');
                const amCaptain = captain && authStore.user?.id === captain.id;
                const isMe = authStore.user?.id === member.id;
                const canKick = amCaptain && !isMe && member.role !== 'captain';
                const isEditingMe = isMe && editingMemberId === member.id;
                const isEditingCard = editingMemberId === member.id;
                const showEditBtn = isMe || canKick;
                return (
                  <div key={member.id} className={`team-member-card${isEditingCard ? ' team-member-card--editing' : ''}`}>
                    {showEditBtn && (
                      <button
                        type="button"
                        className="team-member-edit-btn"
                        onClick={() => {
                          if (editingMemberId === member.id) {
                            setEditingMemberId(null);
                            setConfirmKickUserCode(null);
                          } else {
                            setEditingMemberId(member.id);
                          }
                        }}
                        title={isEditingCard ? 'Свернуть' : 'Редактировать'}
                      >
                        <EditIcon size={14} />
                      </button>
                    )}
                    <div className="team-member-avatar-wrapper">
                      <div className="team-member-avatar">
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.username} />
                        ) : (
                          <div className="team-member-avatar-placeholder">
                            {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      {isOnline(member.last_activity_at) && <span className="team-member-status" title="Онлайн" />}
                    </div>
                    <div className="team-member-name">
                      {member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.username || 'Участник'}
                    </div>
                    <div className="team-member-handle">
                      {member.vk_id ? (
                        <a href={`https://vk.com/id${member.vk_id}`} target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:underline">
                          vk.com/id{member.vk_id}
                        </a>
                      ) : (
                        <>@{member.username || 'user'}</>
                      )}
                    </div>
                    <div className="team-member-roles">
                      {member.role === 'captain' && (
                        <span className="team-role-badge">Капитан</span>
                      )}
                      {isMe ? (
                        isEditingMe ? (
                          <select
                            className="team-specialty-select"
                            value={member.specialty || 'fullstack'}
                            onChange={(e) => handleSpecialtyChange(e.target.value)}
                          >
                            {SPECIALTIES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="team-role-badge">
                            {SPECIALTIES.find(s => s.value === (member.specialty || 'fullstack'))?.label || 'Фулстек'}
                          </span>
                        )
                      ) : (
                        <span className="team-role-badge">
                          {SPECIALTIES.find(s => s.value === (member.specialty || 'fullstack'))?.label || 'Фулстек'}
                        </span>
                      )}
                    </div>
                    <div className="team-member-actions">
                      {isEditingMe && (
                        <button type="button" className="team-member-leave-btn" onClick={handleLeave}>
                          Выйти
                        </button>
                      )}
                      {isEditingCard && canKick && confirmKickUserCode === member.user_code ? (
                        <div className="team-member-kick-confirm">
                          <span className="team-member-kick-confirm-text">Удалить?</span>
                          <button type="button" className="team-member-kick-btn" onClick={() => handleKick(member.user_code)}>
                            Да
                          </button>
                          <button type="button" className="team-member-leave-btn" onClick={() => setConfirmKickUserCode(null)}>
                            Отмена
                          </button>
                        </div>
                      ) : isEditingCard && canKick && (
                        <button type="button" className="team-member-kick-btn" onClick={() => setConfirmKickUserCode(member.user_code)}>
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {emptySlots.map((_, idx) => {
                const captain = currentMembers.find(m => m.role === 'captain');
                const amCaptain = captain && authStore.user?.id === captain.id;
                const isEditing = activeInviteSlot === idx;
                return (
                  <div
                    key={`empty-${idx}`}
                    className="team-member-card team-member-empty"
                    onClick={amCaptain && !isEditing ? () => setActiveInviteSlot(idx) : undefined}
                    style={amCaptain && !isEditing ? { cursor: 'pointer' } : {}}
                  >
                    {isEditing ? (
                      <>
                        <div
                          className="team-invite-inline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!invitePreview ? (
                            <>
                            <label className="team-invite-label">Код участника</label>
                            <div className="team-invite-input-block">
                              <input
                                type="text"
                                maxLength={6}
                                placeholder="ABC123"
                                value={inviteUserCode}
                                onChange={(e) => { setInviteUserCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setInviteError(''); setInvitePreview(null); }}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchInvitePreview())}
                                  className="team-invite-inline-input"
                                  autoFocus
                                  disabled={invitePreviewLoading}
                                />
                                <button
                                  type="button"
                                  className="team-invite-find-btn"
                                  onClick={fetchInvitePreview}
                                  disabled={invitePreviewLoading || inviteUserCode.length !== 6}
                                >
                                  {invitePreviewLoading ? '...' : 'Найти'}
                                </button>
                              </div>
                              {inviteError && <div className="team-invite-error">{inviteError}</div>}
                            </>
                          ) : (
                            <>
                              <div className="team-invite-preview">
                                <div className="team-invite-preview-avatar">
                                  {invitePreview.photo_url ? (
                                    <img src={invitePreview.photo_url} alt="" />
                                  ) : (
                                    <span>{(invitePreview.first_name?.[0] || invitePreview.username?.[0] || 'U').toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="team-invite-preview-name">
                                  {invitePreview.first_name && invitePreview.last_name
                                    ? `${invitePreview.first_name} ${invitePreview.last_name}`
                                    : invitePreview.username || `ID ${invitePreview.id}`}
                                </div>
                                <div className="team-invite-preview-handle">
                                  @{invitePreview.username || `user${invitePreview.id}`}
                                </div>
                              </div>
                              {inviteError && <div className="team-invite-error">{inviteError}</div>}
                              <div className="team-invite-inline-actions">
                                <button
                                  type="button"
                                  className="team-invite-add-btn"
                                  onClick={(e) => { e.preventDefault(); handleInviteByUserCode(e); }}
                                >
                                  Добавить
                                </button>
                                <button
                                  type="button"
                                  className="team-invite-back-btn"
                                  onClick={() => { setInvitePreview(null); setInviteError(''); }}
                                >
                                  Назад
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="team-invite-close-btn"
                          onClick={(e) => { e.stopPropagation(); setActiveInviteSlot(null); setInviteUserCode(''); setInvitePreview(null); setInviteError(''); }}
                          title="Отмена"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="team-member-empty-icon">
                          <PlusIcon size={32} />
                        </div>
                        <div className="team-member-empty-title">Свободный слот</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {team.code && (
            <div className="team-code-section team-code-sidebar">
              <label>КОД КОМАНДЫ</label>
              <div className="team-code-display">
                <span className="team-code-value">{team.code}</span>
                <button
                  type="button"
                  className="team-code-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(team.code);
                    setTeamCodeCopied(true);
                    setTimeout(() => setTeamCodeCopied(false), 2000);
                  }}
                >
                  {teamCodeCopied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>
          )}
          </div>

        </>
      ) : (
        <>
          <div className="team-actions-grid">
            <div className="team-action-card">
              <div className="team-action-icon">
                <FolderPlusIcon size={32} />
              </div>
              <h3>Создать новую команду</h3>
              <p>Внимание! Нецензурные названия команд будут удалены. Название команды должно быть уникальным. </p>
              <div className="team-input-group team-input-group-create">
                <label>НАЗВАНИЕ КОМАНДЫ</label>
                <div className="team-input-wrapper">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      setTeamNameError(false);
                      setCreateError(null);
                    }}
                    placeholder="например DROP_DATABASE"
                    className={teamNameError || createError ? 'error' : ''}
                    title={createError || undefined}
                  />
                  {createError && (
                    <div className="team-input-tooltip" role="alert">
                      {createError}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleCreate} className="team-primary-btn">
                <FolderPlusIcon size={16} />
                Создать команду
              </button>
            </div>

            <div className="team-action-card">
              <div className="team-action-icon">
                <LinkIcon size={32} />
              </div>
              <h3>Присоединиться к команде</h3>
              <p>Введите 6-значный код команды, который дал вам капитан, чтобы присоединиться к составу.</p>
              <div className="team-input-group">
                <label>ВВЕДИТЕ КОД КОМАНДЫ</label>
                <div className="team-input-wrapper">
                  <div className={`team-code-inputs ${teamError && !createError ? 'error' : ''}`}>
                    {teamCode.map((char, index) => (
                      <input
                        key={index}
                        ref={(el) => (codeInputRefs.current[index] = el)}
                        type="text"
                        maxLength={1}
                        value={char}
                        onChange={(e) => {
                          handleCodeChange(index, e.target.value);
                          setTeamError(null);
                        }}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        onPaste={handleCodePaste}
                        className="team-code-input"
                        title={teamError && !createError ? teamError : undefined}
                      />
                    ))}
                  </div>
                  {teamError && !createError && (
                    <div className="team-input-tooltip" role="alert">
                      {teamError}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleJoin} className="team-secondary-btn">
                <LinkIcon size={16} />
                Подключиться
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default observer(Team);

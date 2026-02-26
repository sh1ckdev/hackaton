import { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { FolderPlusIcon, LinkIcon, PlusIcon, TimeIcon } from '../components/Icons';

const Team = () => {
  useDocumentTitle('Команда');
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamNameError, setTeamNameError] = useState(false);
  const [teamCode, setTeamCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef([]);
  const [logs, setLogs] = useState([]);

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

  const handleCreate = async () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setTeamNameError(true);
      return;
    }
    setTeamNameError(false);
    try {
      await api.post('/teams/create', { name: trimmedName });
      const teamResponse = await api.get('/teams/me');
      setTeam(teamResponse.data.team);
      setTeamName('');
      setTeamError(null);
      generateLogs(teamResponse.data.team);
    } catch (error) {
      setTeamError(error.response?.data?.error || 'Ошибка создания команды');
    }
  };

  const maxMembers = 4;
  const currentMembers = team?.members || [];
  const emptySlots = Array(maxMembers - currentMembers.length).fill(null);

  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <h1>Управление командой</h1>
          <p>Управляйте своим составом, приглашайте участников или присоединяйтесь к существующей команде.</p>
        </div>
        <div className="team-deadline">
          <TimeIcon size={16} />
          <span>ДЕДЛАЙН: 48:00:00</span>
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
          <div className="team-members-section">
            <h2>
              Текущий состав [{currentMembers.length}/{maxMembers}]
            </h2>
            <div className="team-members-grid">
              {currentMembers.map((member) => (
                <div key={member.id} className="team-member-card">
                  <div className="team-member-avatar">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.username} />
                    ) : (
                      <div className="team-member-avatar-placeholder">
                        {(member.first_name?.[0] || member.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="team-member-status"></div>
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
                      <span className="team-role-badge">TEAM LEAD</span>
                    )}
                    <span className="team-role-badge">FULL STACK</span>
                  </div>
                </div>
              ))}
              {emptySlots.map((_, idx) => (
                <div key={`empty-${idx}`} className="team-member-card team-member-empty">
                  <div className="team-member-empty-icon">
                    <PlusIcon size={32} />
                  </div>
                  <div className="team-member-empty-title">Open Slot</div>
                  <div className="team-member-empty-desc">
                    Пригласите участника или оставьте для автоподбора.
                  </div>
                  <button className="team-invite-btn">ПРИГЛАСИТЬ</button>
                </div>
              ))}
            </div>
          </div>

          <div className="team-logs">
            <h3>SYSTEM_LOGS</h3>
            <div className="team-logs-list">
              {logs.map((log, idx) => (
                <div key={idx} className="team-log-entry">
                  <span className="team-log-time">{log.time}</span>
                  <span className={`team-log-level team-log-${log.level.toLowerCase()}`}>{log.level}</span>
                  <span className="team-log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="team-actions-grid">
            <div className="team-action-card">
              <div className="team-action-icon">
                <FolderPlusIcon size={32} />
              </div>
              <h3>Initialize New Team</h3>
              <p>Start a fresh repository for your squad. You'll be assigned as the Team Lead automatically.</p>
              <div className="team-input-group">
                <label>TEAM NAME</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    setTeamNameError(false);
                  }}
                  placeholder="e.g. NullPointers"
                  className={teamNameError ? 'error' : ''}
                />
              </div>
              <button onClick={handleCreate} className="team-primary-btn">
                <FolderPlusIcon size={16} />
                Create_Team()
              </button>
            </div>

            <div className="team-action-card">
              <div className="team-action-icon">
                <LinkIcon size={32} />
              </div>
              <h3>Join Existing Team</h3>
              <p>Enter the unique 6-digit hash key provided by your team lead to join the roster.</p>
              <div className="team-input-group">
                <label>ENTER ACCESS CODE</label>
                <div className="team-code-inputs">
                  {teamCode.map((char, index) => (
                    <input
                      key={index}
                      ref={(el) => (codeInputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={char}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      onPaste={handleCodePaste}
                      className="team-code-input"
                    />
                  ))}
                </div>
              </div>
              <button onClick={handleJoin} className="team-secondary-btn">
                <LinkIcon size={16} />
                Connect_To_Squad
              </button>
              <div className="team-status-badge">
                <span>STATUS:</span>
                <span className="team-status-value">READY_TO_DEPLOY</span>
              </div>
            </div>
          </div>

          {teamError && (
            <div className="team-error">
              <strong>Ошибка</strong>
              <span>{teamError}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default observer(Team);

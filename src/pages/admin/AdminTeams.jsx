import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import authStore from '../../stores/authStore';
import api from '../../utils/api';
import { fmtDate } from '../../utils/dateUtils';

const STATUS_LABELS = { pending: 'Ожидает', reviewing: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено' };

const AdminTeams = () => {
  useDocumentTitle('Команды — Админ');
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [cases, setCases] = useState([]);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [caseChanging, setCaseChanging] = useState(false);

  const fetchTeams = async (cat = filter) => {
    try {
      const params = cat ? `?participant_category=${cat}` : '';
      const res = await api.get(`/teams/all${params}`);
      setTeams(res.data.teams);
    } catch {}
  };

  useEffect(() => { fetchTeams(); }, []);
  useEffect(() => { fetchTeams(filter); }, [filter]);

  useEffect(() => {
    api.get('/cases').then(res => setCases(res.data.cases || [])).catch(() => {});
  }, []);

  const openTeam = async (team) => {
    setSelected(team);
    setSelectedSolution(null);
    setSolutionLoading(true);
    setCasePickerOpen(false);
    setSelectedCaseId(team.assigned_case_id ? String(team.assigned_case_id) : '');
    try {
      const res = await api.get(`/admin/teams/${team.id}/solution`);
      setSelectedSolution(res.data.solution || null);
    } catch { setSelectedSolution(null); }
    finally { setSolutionLoading(false); }
  };

  const handleChangeCase = async () => {
    if (!selected) return;
    setCaseChanging(true);
    try {
      await api.put(`/admin/teams/${selected.id}/case`, {
        case_id: selectedCaseId || null,
      });
      const caseTitle = cases.find(c => String(c.id) === selectedCaseId)?.title || null;
      setSelected(prev => ({ ...prev, assigned_case_id: selectedCaseId || null, assigned_case_title: caseTitle }));
      setTeams(prev => prev.map(t => t.id === selected.id
        ? { ...t, assigned_case_id: selectedCaseId || null, assigned_case_title: caseTitle }
        : t
      ));
      setCasePickerOpen(false);
    } catch (e) { alert(e.response?.data?.error || 'Ошибка смены кейса'); }
    finally { setCaseChanging(false); }
  };

  const handleExportCSV = () => {
    const SEP = ';';
    const MAX_MEMBERS = 5;
    const headers = [
      'Команда',
      'Код',
      'Категория',
      'Кейс',
      ...Array.from({ length: MAX_MEMBERS }, (_, i) => [
        `Участник ${i + 1}`,
        `Username ${i + 1}`,
        `Роль ${i + 1}`,
      ]).flat(),
    ];

    const esc = (val) => {
      if (val == null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = teams.map(team => {
      const catLabel = team.participant_category === 'school' ? 'Школьники'
        : team.participant_category === 'student' ? 'Студенты' : '';
      const base = [
        esc(team.name),
        esc(team.team_code || team.code),
        esc(catLabel),
        esc(team.assigned_case_title || ''),
      ];
      const memberCols = [];
      for (let i = 0; i < MAX_MEMBERS; i++) {
        const m = team.members?.[i];
        if (m) {
          const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || '';
          memberCols.push(
            esc(name),
            esc(m.username ? `@${m.username}` : ''),
            esc(m.role === 'captain' ? 'Капитан' : 'Участник'),
          );
        } else {
          memberCols.push('""', '""', '""');
        }
      }
      return [...base, ...memberCols].join(SEP);
    });

    const bom = '\uFEFF';
    const csv = bom + [headers.map(esc).join(SEP), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teams_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRandomize = async () => {
    if (!confirm('Распределить команды по кейсам случайным образом?')) return;
    setRandomizing(true);
    try {
      const res = await api.post('/admin/cases/assign-random');
      await fetchTeams();
      alert(`Кейсы назначены. Команд распределено: ${res.data.assigned}`);
    } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
    finally { setRandomizing(false); }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-4 py-2 bg-terminal-dark/40 border border-terminal-gray text-white focus:border-terminal-blue focus:outline-none rounded">
            <option value="">Все команды</option>
            <option value="school">Школьники</option>
            <option value="student">Студенты</option>
          </select>
          <span className="text-white/40 text-sm">{teams.length} команд</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} disabled={teams.length === 0}
            className="px-4 py-2 bg-terminal-dark/40 border border-terminal-green/60 text-terminal-green hover:bg-terminal-green/10 transition-all text-sm font-medium rounded disabled:opacity-40 flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Выгрузить таблицу
          </button>
          <button onClick={handleRandomize} disabled={randomizing}
            className="px-4 py-2 bg-terminal-dark/40 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all text-sm font-medium rounded disabled:opacity-50">
            {randomizing ? 'Распределение...' : 'Рандомизировать кейсы'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-terminal-gray/40 text-white/50 text-left">
              <th className="pb-3 pr-4 font-medium">Команда</th>
              <th className="pb-3 pr-4 font-medium">Категория</th>
              <th className="pb-3 pr-4 font-medium">Код</th>
              <th className="pb-3 pr-4 font-medium">Участников</th>
              <th className="pb-3 pr-4 font-medium">Кейс</th>
              <th className="pb-3 font-medium">Создана</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-gray/20">
            {teams.length === 0
              ? <tr><td colSpan={6} className="py-8 text-center text-white/50">Команды не найдены</td></tr>
              : teams.map(team => (
                <tr key={team.id} className="hover:bg-terminal-blue/5 cursor-pointer transition-colors" onClick={() => openTeam(team)}>
                  <td className="py-3 pr-4 font-medium text-terminal-blue hover:text-terminal-cyan">{team.name}</td>
                  <td className="py-3 pr-4">
                    {team.participant_category ? (
                      <span className={`px-2 py-0.5 text-xs rounded border ${team.participant_category === 'school' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-terminal-blue/50 text-terminal-cyan bg-terminal-blue/10'}`}>
                        {team.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                      </span>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="py-3 pr-4 font-mono text-white/70">{team.team_code || team.code}</td>
                  <td className="py-3 pr-4 text-white/70">{team.members_count}</td>
                  <td className="py-3 pr-4 text-white/70">{team.assigned_case_title || <span className="text-white/30">не назначен</span>}</td>
                      <td className="py-3 text-white/50">{fmtDate(team.created_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Модальное окно команды */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="glass rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-terminal-gray/40">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-semibold text-white">{selected.name}</h2>
                  {selected.participant_category && (
                    <span className={`px-2 py-0.5 text-xs rounded border ${selected.participant_category === 'school' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-terminal-blue/50 text-terminal-cyan bg-terminal-blue/10'}`}>
                      {selected.participant_category === 'school' ? 'Школьники' : 'Студенты'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50">Код: <span className="font-mono text-white/70">{selected.team_code || selected.code}</span> · Создана: {fmtDate(selected.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {authStore.isAdmin && (
                  <button onClick={async () => {
                    if (!confirm(`Удалить команду «${selected.name}»?`)) return;
                    try { await api.delete(`/admin/teams/${selected.id}`); setSelected(null); fetchTeams(); }
                    catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
                  }} className="px-3 py-1.5 text-sm border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-white rounded transition-colors">
                    Удалить команду
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white/80 text-2xl leading-none">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Назначенный кейс</h3>
                  <button
                    onClick={() => { setCasePickerOpen(v => !v); setSelectedCaseId(selected.assigned_case_id ? String(selected.assigned_case_id) : ''); }}
                    className="text-xs px-2.5 py-1 border border-terminal-cyan/40 text-terminal-cyan hover:bg-terminal-cyan/10 rounded transition-colors"
                  >
                    {casePickerOpen ? 'Отмена' : 'Изменить'}
                  </button>
                </div>
                {casePickerOpen ? (
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={selectedCaseId}
                      onChange={e => setSelectedCaseId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-terminal-dark/60 border border-terminal-gray/50 text-white text-sm rounded focus:border-terminal-cyan focus:outline-none"
                    >
                      <option value="">— Без кейса —</option>
                      {cases.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleChangeCase}
                      disabled={caseChanging}
                      className="px-3 py-2 bg-terminal-cyan/10 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg text-sm font-medium rounded transition-colors disabled:opacity-50 shrink-0"
                    >
                      {caseChanging ? '...' : 'Сохранить'}
                    </button>
                  </div>
                ) : (
                  <p className="text-white/90">{selected.assigned_case_title || <span className="text-white/30 italic">Кейс не назначен</span>}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Участники ({selected.members?.length || 0})</h3>
                <div className="space-y-2">
                  {selected.members?.length ? selected.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-terminal-dark/40 border border-terminal-gray/30 rounded-lg p-3">
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-terminal-dark border border-terminal-gray/50 shrink-0 flex items-center justify-center text-white/50 text-sm font-semibold">
                        {m.photo_url ? <img src={m.photo_url} alt="" className="h-full w-full object-cover" /> : (m.first_name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/90 font-medium text-sm">
                          {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || 'Участник'}
                          {m.role === 'captain' && <span className="ml-2 text-xs text-amber-400 border border-amber-500/40 rounded px-1.5 py-0.5">Капитан</span>}
                        </div>
                        <div className="text-white/40 text-xs">
                          {m.username ? <a href={`https://t.me/${m.username}`} target="_blank" rel="noreferrer" className="text-terminal-cyan hover:underline">@{m.username}</a> : '—'}
                          {m.participant_category && ` · ${m.participant_category === 'school' ? 'Школьник' : 'Студент'}`}
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-white/40 text-sm">Нет участников</p>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Решение</h3>
                {solutionLoading ? <p className="text-white/40 text-sm">Загрузка...</p>
                  : selectedSolution ? (
                    <div className="bg-terminal-dark/40 border border-terminal-gray/30 rounded-lg p-4 space-y-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${selectedSolution.status === 'approved' ? 'border-green-500/50 text-green-400' : selectedSolution.status === 'rejected' ? 'border-red-500/50 text-red-400' : 'border-terminal-gray text-white/50'}`}>
                        {STATUS_LABELS[selectedSolution.status] || selectedSolution.status}
                      </span>
                      {selectedSolution.admin_comment && <p className="text-sm text-white/60 border-l-2 border-terminal-blue/40 pl-3">{selectedSolution.admin_comment}</p>}
                    </div>
                  ) : <p className="text-white/30 text-sm italic">Решение ещё не подано</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(AdminTeams);

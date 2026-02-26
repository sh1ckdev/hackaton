import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import casesStore from '../stores/casesStore';
import authStore from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import CountdownTimer from '../components/CountdownTimer';
import { CaseIcon, TimeIcon } from '../components/Icons';
import api from '../utils/api';

const Cases = () => {
  useDocumentTitle('Кейсы');
  const [teamLoading, setTeamLoading] = useState(true);
  const [assignedCaseId, setAssignedCaseId] = useState(null);
  const [globalOpenDate, setGlobalOpenDate] = useState(null);
  const [openTimeLoading, setOpenTimeLoading] = useState(true);
  
  useEffect(() => {
    casesStore.fetchCases('active');
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchOpenTime = async () => {
      setOpenTimeLoading(true);
      try {
        const response = await api.get('/cases/opening-time');
        const openTime = response.data?.open_time;
        if (isMounted) {
          setGlobalOpenDate(openTime ? new Date(openTime).toISOString() : null);
        }
      } catch (error) {
        if (isMounted) {
          setGlobalOpenDate(null);
        }
      } finally {
        if (isMounted) {
          setOpenTimeLoading(false);
        }
      }
    };
    fetchOpenTime();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTeam = async () => {
      setTeamLoading(true);
      try {
        const response = await api.get('/teams/me');
        const team = response.data?.team;
        if (!isMounted) return;
        setAssignedCaseId(team?.assigned_case_id || null);
        if (team?.assigned_case_id) {
          casesStore.fetchCase(team.assigned_case_id);
        }
      } catch (error) {
        if (isMounted) {
          setAssignedCaseId(null);
        }
      } finally {
        if (isMounted) {
          setTeamLoading(false);
        }
      }
    };
    fetchTeam();
    return () => {
      isMounted = false;
    };
  }, []);

  const assignedCase = useMemo(() => {
    if (!assignedCaseId) return null;
    return (
      casesStore.cases.find((item) => item.id === assignedCaseId) ||
      (casesStore.selectedCase?.id === assignedCaseId ? casesStore.selectedCase : null)
    );
  }, [casesStore.cases, casesStore.selectedCase, assignedCaseId]);

  const displayOpenDate = useMemo(() => {
    if (globalOpenDate) return globalOpenDate;
    if (assignedCaseId) {
      return assignedCase?.opens_at ? new Date(assignedCase.opens_at).toISOString() : null;
    }
    return null;
  }, [assignedCaseId, assignedCase, globalOpenDate]);

  const areCasesOpen = useMemo(() => {
    const now = new Date();

    if (authStore.isModerator) return true;

    if (assignedCaseId) {
      if (!assignedCase) return false;
      return !assignedCase.opens_at || new Date(assignedCase.opens_at) <= now;
    }

    return !globalOpenDate || new Date(globalOpenDate) <= now;
  }, [globalOpenDate, assignedCaseId, assignedCase]);


  const visibleCases = useMemo(() => {
    let filtered = [...casesStore.cases];

    if (!authStore.isModerator) {
      if (assignedCaseId) {
        return assignedCase ? [assignedCase] : [];
      }
      const now = new Date();
      filtered = filtered.filter(c => !c.opens_at || new Date(c.opens_at) <= now);
    }

    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return filtered;
  }, [casesStore.cases, authStore.isModerator, assignedCaseId, assignedCase]);

  const [activeCaseId, setActiveCaseId] = useState(null);

  useEffect(() => {
    if (!visibleCases.length) {
      setActiveCaseId(null);
      return;
    }
    if (!activeCaseId || !visibleCases.find((item) => item.id === activeCaseId)) {
      setActiveCaseId(visibleCases[0].id);
    }
  }, [visibleCases, activeCaseId]);

  const activeCase = useMemo(() => {
    if (!activeCaseId) return visibleCases[0] || null;
    return visibleCases.find((item) => item.id === activeCaseId) || visibleCases[0] || null;
  }, [activeCaseId, visibleCases]);

  const getCaseStatus = (caseItem) => {
    if (!caseItem?.opens_at) return 'OPEN';
    const opensAt = new Date(caseItem.opens_at);
    if (opensAt <= new Date()) return 'OPEN';
    return 'LOCKED';
  };

  const formatCompany = (caseItem) => {
    return caseItem?.company || caseItem?.partner || caseItem?.organization || 'Hackathon';
  };

  const formatPrize = (caseItem) => {
    return caseItem?.prize || caseItem?.reward || caseItem?.bounty || '—';
  };

  return (
    <div className="cases-page">
      <header className="cases-header">
        <div className="cases-header-text">
          <h1>АКТИВНЫЕ КЕЙСЫ</h1>
          <p>// Выберите кейс, чтобы начать работу. Закрытые кейсы откроются по времени или при повышенных правах доступа.</p>
        </div>
        <div className="cases-toolbar">
          <div className="cases-search">
            <span className="cases-search-icon">⌕</span>
            <input type="text" placeholder="ПОИСК (скоро)..." disabled />
          </div>
          <div className="cases-filters">
            <button className="cases-filter is-active" type="button">
              ВСЕ_КЕЙСЫ
            </button>
            <button className="cases-filter" type="button">
              ОТКРЫТЫЕ
            </button>
            <button className="cases-filter" type="button">
              ЗАКРЫТЫЕ
            </button>
          </div>
        </div>
      </header>

      {(casesStore.loading || teamLoading || openTimeLoading) ? (
        <div className="terminal-loading">
          <div className="terminal-loading-container">
            <div>
              <span className="terminal-loading-prompt">sys@hackathon:~$</span>
              <span className="terminal-loading-command">fetch_cases --all</span>
            </div>
            <div className="terminal-loading-status">
              &gt; АКТИВНЫЕ КЕЙСЫ
              <span className="terminal-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
            <div className="terminal-loading-bar"></div>
          </div>
        </div>
      ) : !areCasesOpen && !authStore.isModerator ? (
        <div className="cases-locked">
          <TimeIcon size={48} className="cases-locked-icon" />
          <h2>Кейсы еще не открыты</h2>
          <p>Информация о кейсах будет доступна после их открытия.</p>
          {displayOpenDate && (
            <div className="cases-countdown">
              <div className="cases-countdown-title">
                <TimeIcon size={16} />
                <span>Откроются через</span>
              </div>
              <CountdownTimer targetDate={displayOpenDate} />
            </div>
          )}
        </div>
      ) : assignedCaseId && !assignedCase && !authStore.isModerator ? (
        <div className="cases-empty">
          <CaseIcon size={44} />
          <p>Кейс вашей команде еще не назначен</p>
        </div>
      ) : visibleCases.length === 0 ? (
        <div className="cases-empty">
          <CaseIcon size={44} />
          <p>Нет доступных кейсов</p>
        </div>
      ) : (
        <>
          <div className="cases-grid">
            <div className="cases-table">
              <div className="cases-table-head">
                <span>СТАТУС</span>
                <span>ОРГАНИЗАТОР</span>
                <span>КЕЙС</span>
                <span>ПРИЗ</span>
                <span>КОМАНДЫ</span>
              </div>

              {visibleCases.map((caseItem) => {
                const status = getCaseStatus(caseItem);
                const isActive = caseItem.id === activeCase?.id;
                return (
                  <Link
                    key={caseItem.id}
                    to={`/cases/${caseItem.id}`}
                    onMouseEnter={() => setActiveCaseId(caseItem.id)}
                    className={`cases-row ${isActive ? 'is-active' : ''}`}
                  >
                    <span className={`cases-status ${status === 'OPEN' ? 'is-open' : 'is-locked'}`}>
                      {status}
                    </span>
                    <span className="cases-company">{formatCompany(caseItem)}</span>
                    <span className="cases-challenge">{caseItem.title || 'Без названия'}</span>
                    <span className="cases-prize">{formatPrize(caseItem)}</span>
                    <span className="cases-teams">{caseItem.current_participants ?? '—'}</span>
                  </Link>
                );
              })}

              <div className="cases-table-footer">
                <span className="cases-scan-dot"></span>
                <span>ПОИСК НОВЫХ КЕЙСОВ В СЕТИ... [ СКАНИРОВАНИЕ ]</span>
              </div>
            </div>

            <aside className="cases-preview">
              {activeCase ? (
                <>
                  <div className="cases-preview-hero">
                    <div className="cases-preview-waves" aria-hidden="true"></div>
                    <div className="cases-preview-title">{activeCase.title || 'Без названия'}</div>
                    <div className="cases-preview-code">
                      {activeCase.code || activeCase.slug || `CASE_FILE_${String(activeCase.id).padStart(3, '0')}`}
                    </div>
                  </div>
                  <div className="cases-preview-meta">
                    <div>
                      <span>$</span>
                      <span>{formatPrize(activeCase)}</span>
                      <span className="cases-preview-label">ПРИЗ</span>
                    </div>
                    <div>
                      <span>⚑</span>
                      <span>{activeCase.current_participants ?? '—'}</span>
                      <span className="cases-preview-label">КОМАНДЫ</span>
                    </div>
                  </div>
                  <div className="cases-preview-description">
                    <div className="cases-preview-heading">ОПИСАНИЕ</div>
                    <p>{activeCase.description || 'Описание будет доступно после открытия кейса.'}</p>
                  </div>
                  <Link to={`/cases/${activeCase.id}`} className="cases-preview-action">
                    ОТКРЫТЬ_КЕЙС
                  </Link>
                </>
              ) : (
                <div className="cases-preview-empty">Выберите кейс для просмотра деталей</div>
              )}
            </aside>
          </div>
        </>
      )}

      {casesStore.error && (
        <div className="cases-error">
          {casesStore.error}
        </div>
      )}
    </div>
  );
};

export default observer(Cases);

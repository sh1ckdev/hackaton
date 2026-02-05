import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center px-4">
      <div className="max-w-3xl w-full space-y-10 glass rounded-2xl p-10 border border-terminal-gray/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-terminal-green/60 text-xs uppercase tracking-wide text-terminal-green mb-4">
              &gt; hackathon · terminal edition
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
              Площадка для командных решений
            </h1>
            <p className="text-white/70 text-sm sm:text-base max-w-xl">
              Соберите команду, выберите кейс и отправьте решение. 
              Всё в одном интерфейсе в стиле терминала — без лишнего шума.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right text-xs text-white/60">
            <span className="font-mono text-terminal-green">chermanx.ru$</span>
            <span className="font-mono">/join &amp;&amp; /ship</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4 border border-terminal-green/40">
            <p className="text-xs text-terminal-green mb-1 font-mono">01 / КЕЙСЫ</p>
            <p className="text-sm text-white/80">
              Реальные задачи от организаторов, сгруппированные по сложности.
            </p>
          </div>
          <div className="glass rounded-xl p-4 border border-terminal-cyan/40">
            <p className="text-xs text-terminal-cyan mb-1 font-mono">02 / КОМАНДЫ</p>
            <p className="text-sm text-white/80">
              Командный код, роли и общий прогресс по решениям.
            </p>
          </div>
          <div className="glass rounded-xl p-4 border border-terminal-blue/40">
            <p className="text-xs text-terminal-blue mb-1 font-mono">03 / РЕЙТИНГ</p>
            <p className="text-sm text-white/80">
              Лидерборд участников и команд по оценкам экспертов.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 rounded border border-terminal-green bg-terminal-dark/60 text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-all text-sm font-medium"
          >
            Войти через Telegram
          </Link>
          <span className="text-xs text-white/50">
            Уже авторизованы? Откройте рабочий интерфейс:&nbsp;
            <Link
              to="/cases"
              className="text-terminal-cyan hover:text-terminal-green underline underline-offset-4"
            >
              /cases
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Landing;


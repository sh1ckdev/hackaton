import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CaseIcon, TimeIcon, SolutionIcon, TeamIcon } from '../components/Icons';

const Info = () => {
  useDocumentTitle('Информация');
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Информация</h1>
        <p className="text-gray-400 text-sm">Правила, сроки и полезная информация</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Правила */}
        <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center">
              <CaseIcon size={20} className="text-terminal-green" />
            </div>
            <h2 className="text-xl font-semibold text-white">Правила</h2>
          </div>
          <div className="space-y-3 text-gray-300 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-terminal-green mt-1">•</span>
              <p>Каждый участник может выбрать один кейс для решения</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-terminal-green mt-1">•</span>
              <p>Решение должно быть отправлено до окончания срока</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-terminal-green mt-1">•</span>
              <p>Обязательно укажите ссылку на GitHub репозиторий</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-terminal-green mt-1">•</span>
              <p>Презентация решения опциональна, но рекомендуется</p>
            </div>
          </div>
        </div>

        {/* Критерии оценки */}
        <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/30 flex items-center justify-center">
              <SolutionIcon size={20} className="text-terminal-cyan" />
            </div>
            <h2 className="text-xl font-semibold text-white">Критерии оценки</h2>
          </div>
          <div className="space-y-3 text-gray-300 text-sm">
            <div>
              <p className="font-medium text-white mb-1">Функциональность</p>
              <p className="text-gray-400">Соответствие требованиям кейса</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Качество кода</p>
              <p className="text-gray-400">Читаемость, структура, лучшие практики</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Дизайн и UX</p>
              <p className="text-gray-400">Внешний вид и удобство использования</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Инновационность</p>
              <p className="text-gray-400">Уникальность и креативность решения</p>
            </div>
          </div>
        </div>
      </div>

      {/* Сроки */}
      <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/30 flex items-center justify-center">
            <TimeIcon size={20} className="text-terminal-cyan" />
          </div>
          <h2 className="text-xl font-semibold text-white">Сроки</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-terminal-dark/40 rounded-lg border border-terminal-gray/20">
            <p className="text-xs text-gray-500 mb-1">Начало</p>
            <p className="text-white font-medium">С момента открытия кейса</p>
          </div>
          <div className="p-4 bg-terminal-dark/40 rounded-lg border border-terminal-gray/20">
            <p className="text-xs text-gray-500 mb-1">Длительность</p>
            <p className="text-white font-medium">Указана в описании кейса</p>
          </div>
          <div className="p-4 bg-terminal-dark/40 rounded-lg border border-terminal-gray/20">
            <p className="text-xs text-gray-500 mb-1">Окончание</p>
            <p className="text-white font-medium">До дедлайна кейса</p>
          </div>
        </div>
      </div>

      {/* Полезные ссылки */}
      <div className="border border-terminal-gray/30 rounded-xl p-6 bg-terminal-dark/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center">
            <TeamIcon size={20} className="text-terminal-green" />
          </div>
          <h2 className="text-xl font-semibold text-white">Полезные ссылки</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-terminal-dark/40 rounded-lg border border-terminal-gray/20 hover:border-terminal-green/50 transition-colors group"
          >
            <p className="text-white font-medium group-hover:text-terminal-green transition-colors">GitHub</p>
            <p className="text-xs text-gray-400 mt-1">Платформа для размещения кода</p>
          </a>
          <a
            href="https://docs.github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-terminal-dark/40 rounded-lg border border-terminal-gray/20 hover:border-terminal-green/50 transition-colors group"
          >
            <p className="text-white font-medium group-hover:text-terminal-green transition-colors">GitHub Docs</p>
            <p className="text-xs text-gray-400 mt-1">Документация по работе с Git</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Info;

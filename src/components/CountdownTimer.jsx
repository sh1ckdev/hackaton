import { useState, useEffect } from 'react';

/**
 * Компонент обратного отсчета до открытия кейса
 */
const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (isExpired || !targetDate) {
    return null;
  }

  return (
    <div className="countdown-timer">
      <div className="flex items-center justify-center gap-2 md:gap-4">
        <div className="flex flex-col items-center">
          <div className="text-3xl md:text-5xl font-bold text-terminal-cyan tabular-nums">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm text-gray-400 uppercase">Дней</div>
        </div>
        <div className="text-3xl md:text-5xl font-bold text-terminal-cyan">:</div>
        <div className="flex flex-col items-center">
          <div className="text-3xl md:text-5xl font-bold text-terminal-cyan tabular-nums">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm text-gray-400 uppercase">Часов</div>
        </div>
        <div className="text-3xl md:text-5xl font-bold text-terminal-cyan">:</div>
        <div className="flex flex-col items-center">
          <div className="text-3xl md:text-5xl font-bold text-terminal-cyan tabular-nums">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm text-gray-400 uppercase">Минут</div>
        </div>
        <div className="text-3xl md:text-5xl font-bold text-terminal-cyan">:</div>
        <div className="flex flex-col items-center">
          <div className="text-3xl md:text-5xl font-bold text-terminal-cyan tabular-nums">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm text-gray-400 uppercase">Секунд</div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;

import { useState, useEffect } from 'react';


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
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase">ДНЕЙ</div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-500 mx-0.5">:</div>
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase">ЧАСОВ</div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-500 mx-0.5">:</div>
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase">МИНУТ</div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-500 mx-0.5">:</div>
        <div className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase">СЕК</div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;

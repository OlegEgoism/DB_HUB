export const formatUptime = (uptimeStr: string): string => {
  if (!uptimeStr || uptimeStr === '—') return '—';
  if (uptimeStr.includes('day')) {
    try {
      const parts = uptimeStr.split(' ');
      const days = parseInt(parts[0], 10) || 0;
      const timePart = parts[2] || '00:00:00';
      const [hoursStr, minutes, seconds] = timePart.split(':');
      const totalHours = days * 24 + (parseInt(hoursStr, 10) || 0);
      return `${totalHours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    } catch (err) {
      console.error('Ошибка форматирования времени работы:', err);
      return uptimeStr;
    }
  }
  if (/^\d+:\d+:\d+$/.test(uptimeStr.trim())) {
    return uptimeStr.trim();
  }
  return uptimeStr;
};

export const formatStartTime = (startTimeStr: string): string => {
  if (!startTimeStr || startTimeStr === '—') return '—';
  try {
    const cleanStr = startTimeStr.replace(/ [+-]\d{2}(:\d{2})?$/, '').trim();
    const [datePart, timePart] = cleanStr.split(' ');
    if (!datePart || !timePart) return startTimeStr;
    const [year, month, day] = datePart.split('-');
    return `${day}.${month}.${year} ${timePart}`;
  } catch (err) {
    console.error('Ошибка форматирования времени начала работы:', err);
    return startTimeStr;
  }
};

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function timeToMinutes(time) {
  if (!time) return null;

  const [rawTime, period] = time.split(" ");
  const [hourString, minuteString] = rawTime.split(":");

  let hour = Number(hourString);
  const minute = Number(minuteString);

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

export function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return "";

  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function durationTextToMinutes(durationText) {
  if (!durationText) return null;

  const hourMatch = durationText.match(/(\d+)\s*hour/);
  const minMatch = durationText.match(/(\d+)\s*min/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;

  return hours * 60 + minutes;
}

export function isInvalidTimeRange(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null) return false;

  return start >= end;
}
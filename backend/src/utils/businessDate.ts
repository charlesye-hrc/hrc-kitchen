const BUSINESS_TIME_ZONE = process.env.ORDERING_TIMEZONE || 'Australia/Sydney';

const getDatePartsInTimeZone = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve date parts for timezone ${timeZone}`);
  }

  return { year, month, day };
};

export const getBusinessDateString = (date: Date = new Date()): string => {
  const { year, month, day } = getDatePartsInTimeZone(date, BUSINESS_TIME_ZONE);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const parseDateOnly = (dateStr: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }

  return parsed;
};

export const getBusinessDate = (date: Date = new Date()): Date => {
  return parseDateOnly(getBusinessDateString(date));
};

export const getBusinessTimeZone = (): string => BUSINESS_TIME_ZONE;


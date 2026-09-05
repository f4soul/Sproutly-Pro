import { logger } from '../lib/logger';
import { db } from '../config/db';

export class CalendarService {
  /**
   * Fetches working days from isdayoff.ru API
   * Caches in Dexie DB.
   */
  static async getWorkingDays(year: number): Promise<number[]> {
    try {
      // Check local DB first
      const cached = await db.calendarData.get(year);
      if (cached && cached.workingDays && cached.workingDays.length === 12) {
        return cached.workingDays;
      }

      // Fetch from API
      const response = await fetch(`https://isdayoff.ru/api/getdata?year=${year}`);
      if (!response.ok) throw new Error('API returns error');
      
      const dataStr = await response.text();
      // Year can be 365 or 366 days
      if (dataStr.length < 365) throw new Error('Invalid data length');

      const workingDays = new Array(12).fill(0);
      let dayOfYear = 0;

      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 0; d < daysInMonth; d++) {
          const char = dataStr[dayOfYear];
          // 0 is working day, 4 is working day not holiday (wait, API spec says: 
          // 0 - Рабочий день
          // 1 - Нерабочий день
          // 2 - Сокращенный рабочий день
          // 4 - Рабочий (по умолчанию)
          // We count 0 and 2 and 4. In usually cases, working days are 0.
          if (char === '0' || char === '2' || char === '4') {
            workingDays[month]++;
          }
          dayOfYear++;
        }
      }

      // Cache it
      await db.calendarData.put({ year, workingDays });
      
      return workingDays;
    } catch (error) {
      logger.error('Failed to fetch calendar for ' + year, error);
      // Fallback to average/standard working days
      // Based on typical ~21 days minus some holidays
      if (year === 2024) return [17, 20, 20, 21, 20, 19, 23, 22, 21, 23, 21, 21];
      if (year === 2025) return [17, 20, 21, 22, 19, 20, 23, 21, 22, 23, 19, 22]; // Approximate 2025
      return [17, 20, 21, 21, 20, 20, 22, 22, 21, 22, 21, 21]; // Generic
    }
  }
}

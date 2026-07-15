import prisma from '../lib/prisma';
import { Weekday } from '@prisma/client';

export class ConfigService {
  private readonly businessTimeZone = process.env.ORDERING_TIMEZONE || 'Australia/Sydney';

  /**
   * Get date/time parts in configured business timezone
   */
  private getBusinessDateTimeParts(date: Date): {
    weekday: Weekday;
    hour: number;
    minute: number;
    second: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.businessTimeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(part => part.type === type)?.value;

    const weekdayString = getPart('weekday')?.toUpperCase();
    const weekdayMap: { [key: string]: Weekday } = {
      SUNDAY: 'SUNDAY',
      MONDAY: 'MONDAY',
      TUESDAY: 'TUESDAY',
      WEDNESDAY: 'WEDNESDAY',
      THURSDAY: 'THURSDAY',
      FRIDAY: 'FRIDAY',
      SATURDAY: 'SATURDAY',
    };

    const weekday = weekdayString ? weekdayMap[weekdayString] : undefined;
    if (!weekday) {
      throw new Error(`Unable to resolve weekday for timezone ${this.businessTimeZone}`);
    }

    return {
      weekday,
      hour: Number(getPart('hour') || '0'),
      minute: Number(getPart('minute') || '0'),
      second: Number(getPart('second') || '0'),
    };
  }

  /**
   * Get configuration value by key
   */
  async getConfig(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: key },
    });

    return config ? config.configValue : null;
  }

  /**
   * Get multiple configuration values
   */
  async getConfigs(keys: string[]): Promise<{ [key: string]: string }> {
    const configs = await prisma.systemConfig.findMany({
      where: {
        configKey: {
          in: keys,
        },
      },
    });

    const result: { [key: string]: string } = {};
    configs.forEach(config => {
      result[config.configKey] = config.configValue;
    });

    return result;
  }

  /**
   * Set configuration value
   */
  async setConfig(key: string, value: string, updatedBy?: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { configKey: key },
      update: {
        configValue: value,
        updatedBy,
      },
      create: {
        configKey: key,
        configValue: value,
        updatedBy,
      },
    });
  }

  /**
   * Get ordering window times
   * Returns { start: 'HH:MM', end: 'HH:MM' }
   */
  async getOrderingWindow(): Promise<{ start: string; end: string }> {
    const configs = await this.getConfigs(['ordering_window_start', 'ordering_window_end']);

    return {
      start: configs['ordering_window_start'] || '08:00',
      end: configs['ordering_window_end'] || '10:30',
    };
  }

  /**
   * Check if current time is within ordering window
   */
  async isOrderingWindowActive(): Promise<{ active: boolean; window: { start: string; end: string }; message?: string }> {
    const now = new Date();
    const businessNow = this.getBusinessDateTimeParts(now);
    const currentWeekday = businessNow.weekday;

    // Check if there are any menu items available for today
    const menuItemsToday = await prisma.menuItem.count({
      where: {
        weekdays: {
          has: currentWeekday,
        },
      },
    });

    if (menuItemsToday === 0) {
      return {
        active: false,
        window: { start: '', end: '' },
        message: 'No menu items available for today',
      };
    }

    const window = await this.getOrderingWindow();

    // Parse window times
    const [startHour, startMin] = window.start.split(':').map(Number);
    const [endHour, endMin] = window.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = businessNow.hour * 60 + businessNow.minute;

    const isActive = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

    if (!isActive) {
      if (currentMinutes < startMinutes) {
        return {
          active: false,
          window,
          message: `Ordering opens at ${window.start}`,
        };
      } else {
        return {
          active: false,
          window,
          message: `Ordering closed at ${window.end}`,
        };
      }
    }

    return {
      active: true,
      window,
    };
  }

  /**
   * Set ordering window times
   */
  async setOrderingWindow(start: string, end: string, updatedBy?: string): Promise<void> {
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      throw new Error('Invalid time format. Use HH:MM (24-hour format)');
    }

    // Validate that end is after start
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new Error('End time must be after start time');
    }

    // Validate maximum window duration (8 hours = 480 minutes)
    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes > 480) {
      throw new Error('Ordering window cannot exceed 8 hours');
    }

    await this.setConfig('ordering_window_start', start, updatedBy);
    await this.setConfig('ordering_window_end', end, updatedBy);
  }

  /**
   * Get all configuration
   */
  async getAllConfig(): Promise<any[]> {
    return prisma.systemConfig.findMany({
      orderBy: { configKey: 'asc' },
    });
  }
}

export default new ConfigService();

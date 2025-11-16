import prisma from '../lib/prisma';
import { Weekday } from '@prisma/client';

export class ConfigService {
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
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Get current weekday as Prisma enum
    const weekdayMap: { [key: number]: Weekday } = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    const currentWeekday = weekdayMap[dayOfWeek];

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

    // Create date objects for comparison
    const startTime = new Date(now);
    startTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(endHour, endMin, 0, 0);

    const currentTime = now.getTime();
    const isActive = currentTime >= startTime.getTime() && currentTime <= endTime.getTime();

    if (!isActive) {
      if (currentTime < startTime.getTime()) {
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

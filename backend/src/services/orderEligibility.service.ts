import { ConfigService } from './config.service';
import { getBusinessDate, getBusinessDateString, getBusinessTimeZone, parseDateOnly } from '../utils/businessDate';

type EligibilityReason =
  | 'PREP_DATE_REQUIRED'
  | 'PREP_DATE_INVALID_FORMAT'
  | 'PREP_DATE_OUT_OF_RANGE'
  | 'PREP_DATE_CUTOFF_PASSED';

export interface PrepDateEligibility {
  eligible: boolean;
  reason?: EligibilityReason;
  message?: string;
  prepDate?: Date;
  prepDateString?: string;
  businessDate: string;
  cutoffTime: string;
}

export interface OrderingContextDate {
  date: string;
  label: string;
  weekday: string;
  eligible: boolean;
  reason?: EligibilityReason;
  message?: string;
}

export interface OrderingContext {
  businessDate: string;
  businessTimeZone: string;
  cutoffTime: string;
  selectableDates: OrderingContextDate[];
}

export class OrderEligibilityService {
  private readonly configService: ConfigService;

  constructor(configService?: ConfigService) {
    this.configService = configService ?? new ConfigService();
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private toDateOnlyString(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private getCurrentBusinessMinutes(now: Date = new Date()): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: getBusinessTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find(part => part.type === 'hour')?.value || '0');
    const minute = Number(parts.find(part => part.type === 'minute')?.value || '0');

    return hour * 60 + minute;
  }

  private async getCutoffTime(): Promise<string> {
    const window = await this.configService.getOrderingWindow();
    return window.end;
  }

  private formatDateLabel(date: Date, index: number): { label: string; weekday: string } {
    if (index === 0) {
      return { label: 'Today', weekday: 'Today' };
    }

    if (index === 1) {
      return { label: 'Tomorrow', weekday: 'Tomorrow' };
    }

    const weekday = date.toLocaleDateString('en-AU', {
      timeZone: getBusinessTimeZone(),
      weekday: 'short',
    });
    const dayMonth = date.toLocaleDateString('en-AU', {
      timeZone: getBusinessTimeZone(),
      day: '2-digit',
      month: 'short',
    });

    return {
      label: `${weekday} ${dayMonth}`,
      weekday,
    };
  }

  async evaluatePrepDate(prepDateInput?: string): Promise<PrepDateEligibility> {
    const businessDate = getBusinessDate();
    const businessDateString = getBusinessDateString();
    const cutoffTime = await this.getCutoffTime();

    if (!prepDateInput) {
      return {
        eligible: false,
        reason: 'PREP_DATE_REQUIRED',
        message: 'Prep date is required',
        businessDate: businessDateString,
        cutoffTime,
      };
    }

    let prepDate: Date;
    try {
      prepDate = parseDateOnly(prepDateInput);
    } catch {
      return {
        eligible: false,
        reason: 'PREP_DATE_INVALID_FORMAT',
        message: 'Prep date must use YYYY-MM-DD format',
        businessDate: businessDateString,
        cutoffTime,
      };
    }

    const maxDate = this.addDays(businessDate, 6);
    if (prepDate < businessDate || prepDate > maxDate) {
      return {
        eligible: false,
        reason: 'PREP_DATE_OUT_OF_RANGE',
        message: 'Prep date must be within today and the next 6 days',
        prepDate,
        prepDateString: this.toDateOnlyString(prepDate),
        businessDate: businessDateString,
        cutoffTime,
      };
    }

    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    const cutoffMinutes = cutoffHour * 60 + cutoffMinute;
    const currentMinutes = this.getCurrentBusinessMinutes();
    if (prepDate.getTime() === businessDate.getTime() && currentMinutes > cutoffMinutes) {
      return {
        eligible: false,
        reason: 'PREP_DATE_CUTOFF_PASSED',
        message: `Cutoff has passed for today (${cutoffTime})`,
        prepDate,
        prepDateString: this.toDateOnlyString(prepDate),
        businessDate: businessDateString,
        cutoffTime,
      };
    }

    return {
      eligible: true,
      prepDate,
      prepDateString: this.toDateOnlyString(prepDate),
      businessDate: businessDateString,
      cutoffTime,
    };
  }

  async getOrderingContext(): Promise<OrderingContext> {
    const businessDate = getBusinessDate();
    const businessDateString = getBusinessDateString();
    const cutoffTime = await this.getCutoffTime();

    const selectableDates: OrderingContextDate[] = [];

    for (let offset = 0; offset <= 6; offset++) {
      const date = this.addDays(businessDate, offset);
      const dateString = this.toDateOnlyString(date);
      const eligibility = await this.evaluatePrepDate(dateString);
      const { label, weekday } = this.formatDateLabel(date, offset);

      selectableDates.push({
        date: dateString,
        label,
        weekday,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        message: eligibility.message,
      });
    }

    return {
      businessDate: businessDateString,
      businessTimeZone: getBusinessTimeZone(),
      cutoffTime,
      selectableDates,
    };
  }
}

export default new OrderEligibilityService();

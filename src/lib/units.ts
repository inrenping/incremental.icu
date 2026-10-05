/**
 * 与语言相关的格式化工具。
 *
 * 站点原先把「公里 / 米 / 小时 / 分钟」直接写死在组件里，切到英文后会露出中文。
 * 这里统一走 Common 命名空间，单位由语言包决定。
 *
 * 全部为纯函数，可在任意组件内调用（不依赖 React）。
 */
import { useTranslations } from 'next-intl';

export function useUnitFormatter() {
  const t = useTranslations('Common');

  return {
    /** 距离：>= 1000 米显示公里，否则显示米 */
    distance(meters: number | null | undefined): string {
      if (meters == null || Number.isNaN(meters)) return '--';
      return meters >= 1000
        ? `${(meters / 1000).toFixed(2)} ${t('unitKm')}`
        : `${Math.round(meters)} ${t('unitMeter')}`;
    },
    /** 时长：HH:MM:SS / MM:SS，数字部分与语言无关 */
    clock(seconds: number | null | undefined): string {
      if (seconds == null || seconds === undefined) return '--';
      const total = Math.floor(seconds);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
      if (h > 0) parts.unshift(h.toString().padStart(2, '0'));
      return parts.join(':');
    },
    /** 纯小时数：跑量卡片里的「时长」字段 */
    hours(hours: number | null | undefined): string {
      if (hours == null || Number.isNaN(hours)) return '--';
      return `${hours} ${t('unitHour')}`;
    },
    /** 毫秒 → 人类可读 */
    duration(ms: number | null | undefined): string {
      if (ms == null || Number.isNaN(ms)) return '--';
      if (ms < 1000) return `${ms} ${t('unitMillisecond')}`;
      return `${(ms / 1000).toFixed(1)} ${t('unitSecond')}`;
    },
  };
}

export type UnitFormatter = ReturnType<typeof useUnitFormatter>;

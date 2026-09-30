import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 平台标识 -> i18n 文案 key（空串表示未知平台，调用方回退显示原始值）。 */
export function platformLabelKey(sourceType: string | null | undefined): string {
  if (sourceType === "garmin") return "platformGarmin";
  if (sourceType === "garmin_cn") return "platformGarminCn";
  if (sourceType === "coros") return "platformCoros";
  return "";
}

/** 格式化为「平台（账号）」，账号过长由调用方用 CSS truncate 省略号截断。 */
export function formatPlatformAccount(
  t: (key: string) => string,
  platform: string | null | undefined,
  account: string | null | undefined
): string {
  const key = platformLabelKey(platform);
  const label = key ? t(key) : platform || "-";
  return `${label}（${account || "-"}）`;
}

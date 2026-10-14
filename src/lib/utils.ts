import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 平台标识 -> i18n 文案 key（空串表示未知平台，调用方回退显示原始值）。
 * 注：佳明区分中国区/国际区（garmin_cn / garmin）；颂拓统一走 suunto + region；
 * 高驰不区分区域，统一显示「高驰」。区域后缀见 regionLabelKey。
 */
export function platformLabelKey(sourceType: string | null | undefined): string {
  if (sourceType === "garmin") return "platformGarmin";
  if (sourceType === "garmin_cn") return "platformGarminCn";
  if (sourceType === "coros") return "platformCoros";
  if (sourceType === "suunto") return "platformSuunto";
  return "";
}

/**
 * 后端 region 值 -> 区域 i18n 文案 key。
 * 各家取值不同：佳明 cn/global、颂拓 cn/intl、高驰 coros（无区域概念）。
 * 返回空串表示「该账号没有区域概念」，调用方不应拼区域后缀。
 */
export function regionLabelKey(region: string | null | undefined): string {
  const value = (region || "").trim().toLowerCase();
  if (value === "cn") return "regionCn";
  if (value === "global" || value === "intl") return "regionIntl";
  return "";
}

/** 格式化为「平台（账号）」，账号过长由调用方用 CSS truncate 省略号截断。 */
export function formatPlatformAccount(
  t: (key: string) => string,
  platform: string | null | undefined,
  account: string | null | undefined,
  region?: string | null
): string {
  const key = platformLabelKey(platform);
  const label = key ? t(key) : platform || "-";
  // garmin_cn 这个平台标识本身已含区域语义，避免出现「佳明中国版·中国区」这种重复。
  const regionKey = platform === "garmin_cn" ? "" : regionLabelKey(region);
  const suffix = regionKey ? `·${t(regionKey)}` : "";
  return `${label}${suffix}（${account || "-"}）`;
}

import dayjs from "dayjs";
import zhCN from "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";

export function init(): void {
  dayjs.locale(zhCN);
  dayjs.extend(relativeTime);
}

export const DATE_STANDARD_FORMAT = "YYYY-MM-DD HH:mm:ss";

export function format(
  date: Date | string = new Date(),
  fmt = DATE_STANDARD_FORMAT
): string {
  return dayjs(date).format(fmt);
}

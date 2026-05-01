import { addMinutes, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, MINUTES_PER_SLOT, SLOTS_PER_DAY } from "./constants";

export function assertValidSlotRange(startSlot: number, endSlot: number) {
  if (
    startSlot < 0 ||
    endSlot > SLOTS_PER_DAY ||
    startSlot >= endSlot ||
    !Number.isInteger(startSlot) ||
    !Number.isInteger(endSlot)
  ) {
    throw new Error("Invalid slot range: use 0..96 with endSlot exclusive");
  }
}

/** UTC instant when the shift starts (first 15 min of startSlot) */
export function shiftStartUtc(shiftDate: Date, startSlot: number): Date {
  const ymd = format(shiftDate, "yyyy-MM-dd");
  const localMidnight = fromZonedTime(`${ymd}T00:00:00`, APP_TIMEZONE);
  return addMinutes(localMidnight, startSlot * MINUTES_PER_SLOT);
}

/** True if shift start is strictly before `now` */
export function hasShiftStarted(shiftDate: Date, startSlot: number, now: Date = new Date()) {
  return shiftStartUtc(shiftDate, startSlot) < now;
}

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

export function formatSlot(slot: number, format24h: boolean = false): string {
  const totalMinutes = slot * MINUTES_PER_SLOT;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  if (format24h) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  } else {
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }
}

export function formatSlotRange(startSlot: number, endSlot: number, format24h: boolean = false): string {
  return `${formatSlot(startSlot, format24h)} — ${formatSlot(endSlot, format24h)}`;
}


export function timeToSlot(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return Math.floor((hours * 60 + minutes) / MINUTES_PER_SLOT);
}

export function slotToTime(slot: number): string {
  return formatSlot(slot, true);
}

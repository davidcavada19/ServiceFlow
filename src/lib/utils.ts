import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addSeconds } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: number) {
  return format(new Date(timestamp), "HH:mm:ss");
}

export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDelay(totalSeconds: number) {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(Math.round(totalSeconds));
  const hours = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const sign = isNegative ? "-" : totalSeconds > 0 ? "+" : "";
  
  if (hours > 0) {
    return `${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function calculateDelaySeconds(planned: number, actual: number) {
  return (actual - planned) / 1000;
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeFirstLetter(str: string) {
  if (str.length === 0) {
    return ""; // Handle empty strings
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
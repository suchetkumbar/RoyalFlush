import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const moneyFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** Format an amount as rupees, e.g. 1500 → "₹1,500", -20 → "-₹20". */
export const formatMoney = (amount: number): string =>
  `${amount < 0 ? "-" : ""}₹${moneyFormatter.format(Math.abs(amount))}`;

/** Like formatMoney but always shows a sign for non-zero amounts, e.g. "+₹20". */
export const formatSignedMoney = (amount: number): string =>
  amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount);

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { CURRENCY_PREFERENCE_COOKIE, type Currency } from "@/utils/constants/pricing";
import type { ReactElement, ReactNode } from "react";

/** A year — long enough that a returning visitor still sees the currency they
 *  picked. `SameSite=Lax` because this is a display preference on a public
 *  page, not a credential. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface DisplayCurrency {
  /** What the page is currently quoting. */
  currency: Currency;
  /** What this instance can actually take money in, or null when nothing is
   *  for sale. Fixed for the visit — a toggle changes the display, never the
   *  charge (see the caveat CurrencyToggle renders when the two differ). */
  charging: Currency | null;
  select: (currency: Currency) => void;
}

const Context = createContext<DisplayCurrency | null>(null);

/**
 * One owner for the currency the /pricing page quotes, because two surfaces
 * read it — the plan cards and the comparison table's column headings — and a
 * page showing ₹899/mo in one and $10/mo in the other would be worse than
 * either alone.
 *
 * `initial` is resolved on the SERVER (the visitor's region, or the cookie from
 * last time) so the first paint is already right; the provider only takes over
 * once someone touches the toggle. `children` are server components passed
 * straight through — this file is a boundary, not a rendering layer.
 */
export function DisplayCurrencyProvider({
  initial,
  charging,
  children,
}: {
  initial: Currency;
  charging: Currency | null;
  children: ReactNode;
}): ReactElement {
  const [currency, setCurrency] = useState<Currency>(initial);

  const select = useCallback((next: Currency): void => {
    setCurrency(next);
    document.cookie = `${CURRENCY_PREFERENCE_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }, []);

  const value = useMemo(() => ({ currency, charging, select }), [currency, charging, select]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDisplayCurrency(): DisplayCurrency {
  const value = useContext(Context);
  // Throws rather than defaulting to a currency: a price rendered outside the
  // provider would silently be whatever the fallback guessed, which is the one
  // failure mode this whole file exists to prevent.
  if (!value) throw new Error("useDisplayCurrency needs a DisplayCurrencyProvider above it");
  return value;
}

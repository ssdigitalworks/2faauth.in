import { useEffect, useState } from "react";
import { EMPTY, loadSavedAccounts, subscribeSavedAccounts, type SavedAccount } from "@/lib/saved-accounts";

export function useSavedAccounts(): SavedAccount[] {
  const [accounts, setAccounts] = useState<SavedAccount[]>(EMPTY);

  useEffect(() => {
    // Read after mount to avoid SSR/hydration mismatch; then subscribe to
    // localStorage changes (same tab writes, other tab storage events).
    setAccounts(loadSavedAccounts());
    return subscribeSavedAccounts(() => setAccounts(loadSavedAccounts()));
  }, []);

  return accounts;
}

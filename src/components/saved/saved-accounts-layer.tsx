import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { SavedUIProvider, useSavedUI } from "./saved-store";
import { FloatingSavedButton } from "./floating-saved-button";

// Defer heavy modules until they're actually needed — keeps the landing
// route bundle small and improves LCP / TBT.
const SavedAccountsDrawer = lazy(() =>
  import("./saved-accounts-drawer").then((m) => ({ default: m.SavedAccountsDrawer })),
);
const SaveAccountDialog = lazy(() =>
  import("./save-account-dialog").then((m) => ({ default: m.SaveAccountDialog })),
);
const SavedKeyboardShortcuts = lazy(() =>
  import("./saved-keyboard").then((m) => ({ default: m.SavedKeyboardShortcuts })),
);

export function SavedAccountsLayer({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FloatingSavedButton />
      <DeferredSavedSurfaces />
    </>
  );
}

function DeferredSavedSurfaces() {
  const { drawerOpen, saveDialog } = useSavedUI();
  // Track first interaction so we keep components mounted (for exit animations)
  // without paying for their bundle up front.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const [shortcutsReady, setShortcutsReady] = useState(false);

  useEffect(() => {
    if (drawerOpen) setDrawerLoaded(true);
  }, [drawerOpen]);

  useEffect(() => {
    if (saveDialog.open) setDialogLoaded(true);
  }, [saveDialog.open]);

  // Load keyboard shortcuts after the browser is idle so they don't compete
  // with the initial paint.
  useEffect(() => {
    const ric =
      (window as typeof window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
    if (ric) {
      const id = ric(() => setShortcutsReady(true), { timeout: 2000 });
      return () => {
        const cic = (window as typeof window & {
          cancelIdleCallback?: (id: number) => void;
        }).cancelIdleCallback;
        cic?.(id);
      };
    }
    const t = window.setTimeout(() => setShortcutsReady(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Suspense fallback={null}>
      {drawerLoaded && <SavedAccountsDrawer />}
      {dialogLoaded && <SaveAccountDialog />}
      {shortcutsReady && <SavedKeyboardShortcuts />}
    </Suspense>
  );
}

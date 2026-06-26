import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';
import { createRef, type MutableRefObject, type ReactNode } from 'react';

interface SaveDialogState {
  open: boolean;
  secret: string;
  defaultTitle?: string;
}

export const $drawerOpen = atom<boolean>(false);
export const $saveDialog = atom<SaveDialogState>({ open: false, secret: "" });

// Create a stable global ref for React components to use across islands
const globalSearchInputRef = createRef<HTMLInputElement>() as MutableRefObject<HTMLInputElement | null>;

export function useSavedUI() {
  const drawerOpen = useStore($drawerOpen);
  const saveDialog = useStore($saveDialog);

  return {
    drawerOpen,
    openDrawer: () => $drawerOpen.set(true),
    closeDrawer: () => $drawerOpen.set(false),
    setDrawerOpen: (open: boolean) => $drawerOpen.set(open),

    saveDialog,
    openSaveDialog: (secret: string, defaultTitle?: string) => 
      $saveDialog.set({ open: true, secret, defaultTitle }),
    closeSaveDialog: () => 
      $saveDialog.set({ ...$saveDialog.get(), open: false }),

    searchInputRef: globalSearchInputRef,
  };
}

// Dummy provider to maintain compatibility if it's still rendered
export function SavedUIProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

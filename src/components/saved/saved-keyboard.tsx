import { useEffect } from "react";
import { useSavedUI } from "./saved-store";
import { lock, getVaultMode } from "@/lib/saved-accounts";
import { toast } from "sonner";

/**
 * Global keyboard shortcuts for the Saved Codes feature.
 *  - "/"             → open drawer + focus search (when not typing)
 *  - "Ctrl+Shift+B"  → toggle drawer
 *  - "Esc"           → close drawer (when not in an open input/dialog)
 *  - "Ctrl+L"        → lock vault if encryption is enabled
 */
export function SavedKeyboardShortcuts() {
  const { drawerOpen, openDrawer, closeDrawer, searchInputRef } = useSavedUI();

  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const focusSearchSoon = () => {
      // Wait for the drawer mount/animation before focusing.
      let tries = 0;
      const tick = () => {
        const el = searchInputRef.current;
        if (el) {
          el.focus();
          el.select?.();
        } else if (tries++ < 20) {
          setTimeout(tick, 25);
        }
      };
      tick();
    };

    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+B → toggle drawer (works even while typing).
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (drawerOpen) closeDrawer();
        else {
          openDrawer();
          focusSearchSoon();
        }
        return;
      }

      // Ctrl+L → lock vault.
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "l") {
        if (getVaultMode() === "encrypted-unlocked") {
          e.preventDefault();
          lock();
          toast.success("Vault locked");
        }
        return;
      }

      // "/" → open drawer + focus search (ignore while typing).
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        if (!drawerOpen) openDrawer();
        focusSearchSoon();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen, openDrawer, closeDrawer, searchInputRef]);

  return null;
}

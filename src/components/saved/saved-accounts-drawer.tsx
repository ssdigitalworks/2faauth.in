import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Trash2,
  CheckSquare,
  Square,
  X,
  KeyRound,
  Lock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  clearAll,
  deleteAccount,
  deleteMany,
  getVaultMode,
  restoreAccounts,
  type SavedAccount,
} from "@/lib/saved-accounts";
import { useSavedAccounts } from "@/hooks/use-saved-accounts";
import { useSavedUI } from "./saved-store";
import { SavedAccountCard } from "./saved-account-card";
import { EncryptionControls } from "./encryption-controls";

type PendingDelete =
  | { kind: "none" }
  | { kind: "one"; id: string; title: string }
  | { kind: "many"; ids: string[] }
  | { kind: "all" };

const ROW_HEIGHT = 168; // card height + gap, used by virtualizer
const OVERSCAN = 4;

export function SavedAccountsDrawer() {
  const { drawerOpen, setDrawerOpen, searchInputRef } = useSavedUI();
  const accounts = useSavedAccounts();
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingDelete>({ kind: "none" });
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const scrollRef = useRef<HTMLDivElement>(null);
  const localSearchRef = useRef<HTMLInputElement>(null);

  const vaultMode = getVaultMode();
  const locked = vaultMode === "encrypted-locked";

  // Expose search input ref to the global UI store for keyboard shortcuts.
  useEffect(() => {
    searchInputRef.current = localSearchRef.current;
    return () => {
      if (searchInputRef.current === localSearchRef.current) {
        searchInputRef.current = null;
      }
    };
  }, [searchInputRef, drawerOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.issuer.toLowerCase().includes(q) ||
        a.algorithm.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  // Clamp focus when filtered list shrinks.
  useEffect(() => {
    if (focusedIdx >= filtered.length) setFocusedIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, focusedIdx]);

  // Track viewport height for virtualization.
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, [drawerOpen]);

  const toggleSelected = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const undoToast = (removed: SavedAccount[], label: string) => {
    if (removed.length === 0) return;
    toast(label, {
      action: {
        label: "Undo",
        onClick: () => {
          restoreAccounts(removed).then(() => toast.success("Restored"));
        },
      },
      duration: 8000,
    });
  };

  const confirmDelete = async () => {
    try {
      if (pending.kind === "one") {
        const removed = await deleteAccount(pending.id);
        undoToast(removed, `Deleted "${pending.title}"`);
      } else if (pending.kind === "many") {
        const removed = await deleteMany(pending.ids);
        undoToast(removed, `Deleted ${pending.ids.length} items`);
        exitSelect();
      } else if (pending.kind === "all") {
        const removed = await clearAll();
        undoToast(removed, `Cleared ${removed.length} saved codes`);
        exitSelect();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
    setPending({ kind: "none" });
  };

  // Keyboard navigation inside the drawer.
  const focusCard = useCallback((idx: number) => {
    setFocusedIdx(idx);
    const el = scrollRef.current;
    if (!el) return;
    const top = idx * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTo({ top: top - 8, behavior: "smooth" });
    else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: bottom - el.clientHeight + 8, behavior: "smooth" });
    }
  }, []);

  const onDrawerKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) focusCard(Math.min(filtered.length - 1, focusedIdx + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) focusCard(Math.max(0, focusedIdx - 1));
    } else if (e.key === "Home" && !isTyping) {
      e.preventDefault();
      focusCard(0);
    } else if (e.key === "End" && !isTyping) {
      e.preventDefault();
      focusCard(filtered.length - 1);
    } else if (e.key === "Enter" && !isTyping) {
      const a = filtered[focusedIdx];
      if (a) {
        const card = scrollRef.current?.querySelector<HTMLButtonElement>(
          `[data-card-id="${a.id}"] [data-copy-btn]`,
        );
        card?.click();
      }
    } else if (e.key === "Delete" && !isTyping) {
      const a = filtered[focusedIdx];
      if (a) setPending({ kind: "one", id: a.id, title: a.title });
    }
  };

  // Virtualization windowing.
  const total = filtered.length;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(
    total,
    Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN,
  );
  const offsetY = startIdx * ROW_HEIGHT;
  const visible = filtered.slice(startIdx, endIdx);
  const useVirtual = total > 30;

  const count = accounts.length;

  return (
    <>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-background/95 backdrop-blur-xl"
          onKeyDown={onDrawerKeyDown}
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-brand/10 text-brand grid place-items-center">
                  <KeyRound className="size-4" />
                </div>
                Saved Codes
                <Badge variant="secondary" className="ml-1 font-mono">{count}</Badge>
                {vaultMode !== "plain" && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3" />
                    {vaultMode === "encrypted-locked" ? "Locked" : "Encrypted"}
                  </Badge>
                )}
              </SheetTitle>
            </div>
            <SheetDescription>
              Your 2FA accounts, stored only in this browser.
            </SheetDescription>
          </SheetHeader>

          {locked ? (
            <LockedView />
          ) : (
            <>
              <div className="px-5 py-3 border-b border-border space-y-2.5">
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    ref={localSearchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search title, issuer…  (press / )"
                    className="ps-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectMode ? (
                    <>
                      <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                        {allFilteredSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                        {allFilteredSelected ? "Unselect all" : "Select all"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={selected.size === 0}
                        onClick={() => setPending({ kind: "many", ids: Array.from(selected) })}
                      >
                        <Trash2 className="size-4" />
                        Delete ({selected.size})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={exitSelect}>
                        <X className="size-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setSelectMode(true)} disabled={count === 0}>
                        <CheckSquare className="size-4" />
                        Select
                      </Button>
                      <EncryptionControls mode={vaultMode} />
                      {count > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ms-auto text-destructive hover:text-destructive"
                          onClick={() => setPending({ kind: "all" })}
                        >
                          Clear all
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div
                ref={scrollRef}
                onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
                className="flex-1 overflow-y-auto px-5 py-4"
              >
                {count === 0 ? (
                  <EmptyState />
                ) : filtered.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-12">
                    No matches for &ldquo;{query}&rdquo;.
                  </div>
                ) : useVirtual ? (
                  <div style={{ height: total * ROW_HEIGHT, position: "relative" }}>
                    <div style={{ transform: `translateY(${offsetY}px)` }}>
                      {visible.map((a, i) => {
                        const absIdx = startIdx + i;
                        return (
                          <div
                            key={a.id}
                            style={{ height: ROW_HEIGHT, paddingBottom: 10 }}
                            data-card-id={a.id}
                          >
                            <SavedAccountCard
                              account={a}
                              selectMode={selectMode}
                              selected={selected.has(a.id)}
                              focused={absIdx === focusedIdx}
                              onToggleSelected={toggleSelected}
                              onRequestDelete={(id) =>
                                setPending({ kind: "one", id, title: a.title })
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map((a, i) => (
                      <div key={a.id} data-card-id={a.id}>
                        <SavedAccountCard
                          account={a}
                          selectMode={selectMode}
                          selected={selected.has(a.id)}
                          focused={i === focusedIdx}
                          onToggleSelected={toggleSelected}
                          onRequestDelete={(id) =>
                            setPending({ kind: "one", id, title: a.title })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pending.kind !== "none"}
        onOpenChange={(o) => (!o ? setPending({ kind: "none" }) : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending.kind === "all"
                ? "Clear all saved accounts?"
                : pending.kind === "many"
                  ? `Delete ${pending.ids.length} accounts?`
                  : pending.kind === "one"
                    ? `Delete "${pending.title}"?`
                    : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You can undo this from the snackbar right after deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

function LockedView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
      <div className="size-14 rounded-2xl bg-brand/10 text-brand grid place-items-center">
        <Lock className="size-7" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Vault locked</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Your saved codes are encrypted. Unlock with your passphrase to view them.
        </p>
      </div>
      <EncryptionControls mode="encrypted-locked" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="size-14 rounded-2xl bg-brand/10 text-brand grid place-items-center mb-4">
        <KeyRound className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No Saved Codes Yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-[14rem]">
        Save 2FA accounts to access their rolling codes here, anytime.
      </p>
    </div>
  );
}

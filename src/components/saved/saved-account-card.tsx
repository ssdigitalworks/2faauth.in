import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { currentCode } from "@/lib/totp";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { renameAccount, type SavedAccount } from "@/lib/saved-accounts";
import { toast } from "sonner";

interface Props {
  account: SavedAccount;
  selectMode: boolean;
  selected: boolean;
  focused?: boolean;
  onToggleSelected: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

export function SavedAccountCard({
  account,
  selectMode,
  selected,
  focused,
  onToggleSelected,
  onRequestDelete,
}: Props) {
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.title);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const code = useMemo(
    () =>
      mounted
        ? currentCode(
            {
              issuer: account.issuer,
              label: account.title,
              secret: account.secret,
              digits: account.digits,
              period: account.period,
              algorithm: account.algorithm,
            },
            now,
          )
        : "------",
    [account, mounted, now],
  );

  const remaining = mounted ? account.period - Math.floor(now / 1000) % account.period : account.period;
  const pct = (remaining / account.period) * 100;
  const low = remaining <= 5;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 1200);
  };

  const commitRename = async () => {
    const next = draft.trim();
    if (next && next !== account.title) {
      try {
        await renameAccount(account.id, next);
        toast.success("Renamed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rename failed.");
      }
    }
    setEditing(false);
  };

  return (
    <div
      className={`group rounded-xl bg-card/60 backdrop-blur ring-1 transition-all ${
        focused ? "ring-brand ring-2 shadow-md shadow-brand/10" :
        selected ? "ring-brand/60 bg-brand/5" : "ring-border hover:ring-foreground/20"
      }`}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          {selectMode && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelected(account.id)}
              className="mt-1"
              aria-label={`Select ${account.title}`}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {editing ? (
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") {
                      setDraft(account.title);
                      setEditing(false);
                    }
                  }}
                  className="h-7 text-sm"
                  autoFocus
                  maxLength={80}
                />
              ) : (
                <div className="truncate text-sm font-semibold text-foreground">{account.title}</div>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              {account.issuer && <span className="truncate">{account.issuer}</span>}
              {account.issuer && <span aria-hidden>·</span>}
              <span className="uppercase tracking-wider">{account.algorithm}</span>
              <span aria-hidden>·</span>
              <span>{account.digits} digits</span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                aria-label="Rename"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestDelete(account.id)}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
              aria-label="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div
            className="font-mono tabular-nums text-2xl font-semibold tracking-[0.14em] text-foreground"
            dir="ltr"
            aria-live="polite"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={code}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="inline-block whitespace-nowrap"
              >
                {code.match(/.{1,3}/g)?.join(" ")}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={copy}
            data-copy-btn=""
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md ring-1 ring-border bg-background hover:bg-muted transition"
          >
            {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`absolute inset-y-0 start-0 rounded-full transition-[width] duration-500 ${low ? "bg-destructive" : "bg-brand"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className={`font-mono tabular-nums text-[10px] w-8 text-end ${low ? "text-destructive" : "text-muted-foreground"}`}>
            {remaining}s
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Lock, Unlock, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  disableEncryption,
  enableEncryption,
  getVaultMode,
  lock,
  unlock,
  type VaultMode,
} from "@/lib/saved-accounts";

interface Props {
  mode: VaultMode;
}

type DialogState =
  | { kind: "none" }
  | { kind: "enable" }
  | { kind: "unlock" }
  | { kind: "disable" };

export function EncryptionControls({ mode }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const reset = () => {
    setPass("");
    setPass2("");
    setBusy(false);
    setDialog({ kind: "none" });
  };

  const handleSubmit = async () => {
    setBusy(true);
    try {
      if (dialog.kind === "enable") {
        if (pass.length < 6) throw new Error("Passphrase must be at least 6 characters.");
        if (pass !== pass2) throw new Error("Passphrases don't match.");
        await enableEncryption(pass);
        toast.success("Encryption enabled", { description: "Your codes are now AES-GCM encrypted." });
      } else if (dialog.kind === "unlock") {
        await unlock(pass);
        toast.success("Vault unlocked");
      } else if (dialog.kind === "disable") {
        await disableEncryption(pass);
        toast.success("Encryption disabled");
      }
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
      setBusy(false);
    }
  };

  return (
    <>
      {mode === "plain" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog({ kind: "enable" })}
          title="Encrypt saved codes with a passphrase"
        >
          <ShieldCheck className="size-4" />
          Encrypt
        </Button>
      )}
      {mode === "encrypted-locked" && (
        <Button size="sm" onClick={() => setDialog({ kind: "unlock" })}>
          <Unlock className="size-4" />
          Unlock
        </Button>
      )}
      {mode === "encrypted-unlocked" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              lock();
              toast.success("Vault locked");
            }}
            title="Lock vault (Ctrl+L)"
          >
            <Lock className="size-4" />
            Lock
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDisable(true)}
            title="Remove encryption"
          >
            <ShieldOff className="size-4" />
          </Button>
        </>
      )}

      <Dialog open={dialog.kind !== "none"} onOpenChange={(o) => (!o ? reset() : null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-brand" />
              {dialog.kind === "enable" && "Enable encryption"}
              {dialog.kind === "unlock" && "Unlock vault"}
              {dialog.kind === "disable" && "Disable encryption"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "enable" &&
                "Choose a passphrase. It is never sent anywhere — if you lose it, your codes cannot be recovered."}
              {dialog.kind === "unlock" &&
                "Enter your passphrase to decrypt saved codes for this session."}
              {dialog.kind === "disable" &&
                "Confirm your passphrase. Codes will be stored in plain text after this."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="vault-pass">Passphrase</Label>
              <Input
                id="vault-pass"
                type="password"
                autoFocus
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) handleSubmit();
                }}
              />
            </div>
            {dialog.kind === "enable" && (
              <div>
                <Label htmlFor="vault-pass2">Confirm passphrase</Label>
                <Input
                  id="vault-pass2"
                  type="password"
                  value={pass2}
                  onChange={(e) => setPass2(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !busy) handleSubmit();
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={busy || !pass}>
              {busy ? "Working…" : dialog.kind === "enable" ? "Encrypt" : dialog.kind === "unlock" ? "Unlock" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable encryption?</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved codes will be stored unencrypted in this browser. You can re-enable it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDisable(false);
                if (getVaultMode() !== "plain") setDialog({ kind: "disable" });
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

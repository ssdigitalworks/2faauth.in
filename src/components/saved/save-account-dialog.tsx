import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { addAccount, isDuplicateSecret, sanitizeText } from "@/lib/saved-accounts";
import { useSavedUI } from "./saved-store";

export function SaveAccountDialog() {
  const { saveDialog, closeSaveDialog, openDrawer } = useSavedUI();
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");

  useEffect(() => {
    if (saveDialog.open) {
      setTitle(saveDialog.defaultTitle ?? "");
      setIssuer("");
    }
  }, [saveDialog.open, saveDialog.defaultTitle]);

  const handleSave = async () => {
    const cleanTitle = sanitizeText(title) || "Untitled account";
    if (isDuplicateSecret(saveDialog.secret)) {
      toast.error("This secret is already saved.");
      closeSaveDialog();
      return;
    }
    try {
      const acc = await addAccount({ title: cleanTitle, issuer: sanitizeText(issuer), secret: saveDialog.secret });
      if (!acc) {
        toast.error("Could not save — invalid secret.");
        return;
      }
      toast.success("Saved", {
        description: cleanTitle,
        action: { label: "View", onClick: () => openDrawer() },
      });
      closeSaveDialog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  };

  return (
    <Dialog open={saveDialog.open} onOpenChange={(o) => (!o ? closeSaveDialog() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save this account</DialogTitle>
          <DialogDescription>
            Stored only in your browser. Nothing is sent to a server.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="save-title">Title</Label>
            <Input
              id="save-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub — work"
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
          <div>
            <Label htmlFor="save-issuer">Issuer (optional)</Label>
            <Input
              id="save-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="Google, GitHub, AWS…"
              maxLength={80}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeSaveDialog}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

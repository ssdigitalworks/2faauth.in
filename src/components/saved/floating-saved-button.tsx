import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { useSavedUI } from "./saved-store";

const PLAIN_KEY = "tfa.saved-accounts.v1";
const ENCRYPTED_KEY = "tfa.saved-accounts.enc.v1";
const SAVED_EVENT = "tfa:saved-accounts:changed";


function readSavedCount() {
  if (typeof window === "undefined") return 0;
  try {
    if (localStorage.getItem(ENCRYPTED_KEY)) return 0;
    const parsed = JSON.parse(localStorage.getItem(PLAIN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function FloatingSavedButton() {
  const { openDrawer, drawerOpen } = useSavedUI();
  const [count, setCount] = useState(0);
  const [clickKey, setClickKey] = useState(0);

  useEffect(() => {
    const update = () => setCount(readSavedCount());
    update();
    window.addEventListener(SAVED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SAVED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (drawerOpen) return null;

  const handleClick = () => {
    setClickKey((k) => k + 1);
    openDrawer();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}
      whileTap={{ scale: 0.92, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="fixed start-5 z-40 inline-flex items-center gap-2 rounded-full bg-foreground text-background ps-4 pe-5 py-3 text-sm font-semibold shadow-lg ring-1 ring-foreground/10 backdrop-blur relative overflow-hidden"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
      aria-label={`Open saved codes (${count})`}
    >
      <motion.div
        key={`bookmark-${clickKey}`}
        initial={{ rotate: 0, scale: 1 }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
      >
        <Bookmark className="size-4" fill="currentColor" />
      </motion.div>
      <span>Saved</span>
      <motion.span
        key={`count-${clickKey}`}
        className="grid h-5 min-w-5 place-items-center rounded-full bg-background/20 px-1.5 font-mono text-[12px] text-background font-bold"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.3, type: "spring" }}
      >
        {count}
      </motion.span>

      {/* Expanding burst ring */}
      <motion.span
        key={`ring-${clickKey}`}
        className="absolute inset-0 rounded-full border-2 border-background/60 pointer-events-none"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </motion.button>
  );
}

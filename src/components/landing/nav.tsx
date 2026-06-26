import { Moon, Sun, KeyRound, Menu, X, Bookmark } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useSavedUI } from "@/components/saved/saved-store";

export function LandingNav() {
  const { theme, toggle } = useTheme();
  const { openDrawer } = useSavedUI();
  const siteName = "2FA auth";
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 1, label: "About", url: "/about" },
    { id: 2, label: "Home", url: "/" },
    { id: 3, label: "Blog", url: "/blog" },
    { id: 4, label: "Privacy", url: "/privacy" },
    { id: 5, label: "Terms", url: "/terms" },
    { id: 6, label: "Disclaimer", url: "/disclaimer" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        {/* Left side: Logo */}
        <a
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-80 transition"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground glow-brand-subtle">
            <KeyRound className="size-4.5" strokeWidth={2.5} />
          </div>
          <span className="text-lg">{siteName}</span>
        </a>

        {/* Right side: Links and Controls */}
        <div className="flex items-center gap-5 sm:gap-6">
          <div className="hidden md:flex items-center gap-5 sm:gap-6 text-sm font-medium text-muted-foreground">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target={item.url.startsWith("/") ? undefined : "_blank"}
                rel={item.url.startsWith("/") ? undefined : "noopener noreferrer"}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          
          <button
            onClick={openDrawer}
            className="flex items-center gap-2 text-sm font-medium text-brand hover:text-brand/80 transition-colors bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-md"
          >
            <Bookmark className="size-4" />
            <span>Saved Codes</span>
          </button>

          <button
            aria-label="Toggle theme"
            onClick={toggle}
            className="size-9 grid place-items-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            aria-label="Toggle menu"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden size-9 grid place-items-center rounded-md hover:bg-muted transition-colors"
          >
            {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-5 py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target={item.url.startsWith("/") ? undefined : "_blank"}
                rel={item.url.startsWith("/") ? undefined : "noopener noreferrer"}
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "size-6 rounded-md bg-brand text-brand-foreground grid place-items-center glow-brand",
        className,
      )}
    >
      <KeyRound className="size-3.5" strokeWidth={2.5} />
    </div>
  );
}

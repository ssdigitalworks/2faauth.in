import { useSiteSettings, useNavItems } from "@/hooks/use-site-settings";

export function LandingFooter() {
  const settings = useSiteSettings();
  const nav = useNavItems();

  const currentYear = new Date().getFullYear();
  const copyright = settings.data?.copyright_text?.replace("{year}", currentYear.toString())
    || `© ${currentYear} ${settings.data?.site_name || "2FA auth"}. All rights reserved.`;

  return (
    <footer className="border-t bg-muted/40 pb-8 pt-16">
      <div className="container px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{settings.data?.site_name || "2FA auth"}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {settings.data?.footer_text || "A secure, privacy-first, zero-knowledge TOTP 2FA generator running entirely in your browser."}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {nav.data?.filter(it => it.visible).map(it => (
                <li key={it.id}><a href={it.url} className="hover:text-foreground hover:underline transition-colors">{it.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/privacy" className="hover:text-foreground hover:underline transition-colors">Privacy policy</a></li>
              <li><a href="/terms" className="hover:text-foreground hover:underline transition-colors">Terms of service</a></li>
              <li><a href="/disclaimer" className="hover:text-foreground hover:underline transition-colors">Disclaimer</a></li>
              <li><a href="/faq" className="hover:text-foreground hover:underline transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {settings.data?.contact_email && (
                <li><a href={`mailto:${settings.data.contact_email}`} className="hover:text-foreground hover:underline transition-colors">{settings.data.contact_email}</a></li>
              )}
              {settings.data?.contact_info && (
                <li className="whitespace-pre-wrap">{settings.data.contact_info}</li>
              )}
              <li><a href="/auth" className="hover:text-foreground hover:underline transition-colors">Admin login</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          {copyright}
        </div>
      </div>
    </footer>
  );
}

export {};

declare global {
  interface DocumentEventMap {
    'tfa:open-drawer': CustomEvent;
    'tfa:open-save': CustomEvent<{ secret: string; defaultName: string }>;
    'tfa:use-secret': CustomEvent<{ secret: string }>;
    'tfa:account-saved': CustomEvent;
    'tfa:render-accounts': CustomEvent;
  }
}

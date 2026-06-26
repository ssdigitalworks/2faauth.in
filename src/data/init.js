import fs from 'node:fs';
import path from 'node:path';

// Define where to store our local data
const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// Make sure the data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initial default data if db.json doesn't exist
const defaultData = {
  site_settings: {
    site_name: "2FA auth",
    site_description: "A secure, privacy-first, zero-knowledge TOTP 2FA generator running entirely in your browser.",
    footer_text: "A secure, privacy-first, zero-knowledge TOTP 2FA generator running entirely in your browser.",
    contact_email: "support@example.com",
    contact_info: ""
  },
  ad_settings: {
    adsense_client: "",
    auto_ads: false,
    enabled: false,
    header_ad_enabled: false,
    footer_ad_enabled: false
  }
};

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
}

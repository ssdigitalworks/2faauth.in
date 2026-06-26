import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface SiteSettings {
  site_name: string;
  site_description: string;
  footer_text: string;
  contact_email: string;
  contact_info: string;
  copyright_text?: string;
}

export interface AdSettings {
  adsense_client: string;
  auto_ads: boolean;
  enabled: boolean;
  left_ad_enabled: boolean;
  right_ad_enabled: boolean;
}

export interface NavItem {
  id: number;
  label: string;
  url: string;
  visible: boolean;
  order_index: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
}

export interface Database {
  site_settings: SiteSettings;
  ad_settings: AdSettings;
  nav_items: NavItem[];
  blog_posts: BlogPost[];
}

const defaultDB: Database = {
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
    left_ad_enabled: false,
    right_ad_enabled: false
  },
  nav_items: [
    { id: 1, label: "About", url: "/about", visible: true, order_index: 0 },
    { id: 2, label: "Blog", url: "/blog", visible: true, order_index: 1 },
    { id: 3, label: "Contact", url: "/contact", visible: true, order_index: 2 },
    { id: 4, label: "Privacy", url: "/privacy", visible: true, order_index: 3 },
    { id: 5, label: "Terms", url: "/terms", visible: true, order_index: 4 },
    { id: 6, label: "Disclaimer", url: "/disclaimer", visible: true, order_index: 5 },
  ],
  blog_posts: []
};

function readDB(): Database {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return { ...defaultDB, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Failed to read DB", e);
  }
  return defaultDB;
}

function writeDB(data: Database) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write DB", e);
  }
}

// --- Async Getters ---

export async function getSiteSettings(): Promise<SiteSettings> {
  if (supabase) {
    const { data } = await supabase.from('site_settings').select('*').single();
    if (data) return data;
  }
  return readDB().site_settings;
}

export async function getAdSettings(): Promise<AdSettings> {
  if (supabase) {
    const { data } = await supabase.from('ad_settings').select('*').single();
    if (data) return data;
  }
  return readDB().ad_settings;
}

export async function getNavItems(): Promise<NavItem[]> {
  if (supabase) {
    const { data } = await supabase.from('nav_items').select('*').order('order_index');
    if (data) return data;
  }
  return readDB().nav_items || [];
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  if (supabase) {
    const { data } = await supabase.from('blog_posts').select('*').order('date', { ascending: false });
    if (data) return data;
  }
  return readDB().blog_posts || [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  if (supabase) {
    const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).single();
    if (data) return data;
  }
  return readDB().blog_posts?.find(p => p.slug === slug);
}

// --- Async Setters ---

export async function saveSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  if (supabase) {
    await supabase.from('site_settings').upsert({ id: 1, ...settings });
    return;
  }
  const db = readDB();
  db.site_settings = { ...db.site_settings, ...settings };
  writeDB(db);
}

export async function saveAdSettings(settings: Partial<AdSettings>): Promise<void> {
  if (supabase) {
    await supabase.from('ad_settings').upsert({ id: 1, ...settings });
    return;
  }
  const db = readDB();
  db.ad_settings = { ...db.ad_settings, ...settings };
  writeDB(db);
}

export async function saveNavItems(items: NavItem[]): Promise<void> {
  if (supabase) {
    // Basic sync: delete all and insert new
    await supabase.from('nav_items').delete().neq('id', 0);
    if (items.length > 0) {
      await supabase.from('nav_items').insert(items);
    }
    return;
  }
  const db = readDB();
  db.nav_items = items;
  writeDB(db);
}

export async function saveBlogPost(post: BlogPost): Promise<void> {
  if (supabase) {
    await supabase.from('blog_posts').upsert(post);
    return;
  }
  const db = readDB();
  db.blog_posts = db.blog_posts || [];
  const existing = db.blog_posts.findIndex(p => p.id === post.id);
  if (existing >= 0) {
    db.blog_posts[existing] = post;
  } else {
    db.blog_posts.push(post);
  }
  writeDB(db);
}

export async function deleteBlogPost(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('blog_posts').delete().eq('id', id);
    return;
  }
  const db = readDB();
  if (db.blog_posts) {
    db.blog_posts = db.blog_posts.filter(p => p.id !== id);
    writeDB(db);
  }
}

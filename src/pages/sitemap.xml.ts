import type { APIRoute } from 'astro';
import { getBlogPosts } from '@/lib/db';

const BASE_URL = "https://2faauth.in";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly" | "yearly";
  priority?: string;
}

export const GET: APIRoute = async () => {
  const dbPosts = await getBlogPosts();
  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/about", changefreq: "monthly", priority: "0.7" },
    { path: "/blog", changefreq: "weekly", priority: "0.7" },
    { path: "/contact", changefreq: "monthly", priority: "0.6" },
    { path: "/faq", changefreq: "monthly", priority: "0.6" },
    { path: "/privacy", changefreq: "yearly", priority: "0.4" },
    { path: "/terms", changefreq: "yearly", priority: "0.4" },
    { path: "/disclaimer", changefreq: "yearly", priority: "0.4" },
    ...dbPosts.map((p) => ({
      path: `/blog/${p.slug}`,
      changefreq: "monthly" as const,
      priority: "0.5",
    })),
  ];
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  );
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}

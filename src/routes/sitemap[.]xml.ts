import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://eternalmemorys.enterprises";

/** Public pages worth indexing — the app itself lives behind auth. */
const PUBLIC_PATHS = ["/", "/auth"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PUBLIC_PATHS.map(
          (path) =>
            `  <url>\n    <loc>${BASE_URL}${path}</loc>\n` +
            `    <changefreq>weekly</changefreq>\n` +
            `    <priority>${path === "/" ? "1.0" : "0.6"}</priority>\n  </url>`,
        ).join("\n");

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

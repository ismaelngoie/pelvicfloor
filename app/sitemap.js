import { promises as fs } from 'fs';
import path from 'path';

export default async function sitemap() {
  const baseUrl = 'https://pelvi.health';
  const blogDirectory = path.join(process.cwd(), 'public/blog');

  // 1. Define Static Pages (The Core App)
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0, // Homepage is King
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9, // Blog Index is Queen
    },
  ];

  // 2. Dynamic Blog Posts (Auto-detected from public/blog folder)
  let blogPages = [];
  
  try {
    // Read the directory
    const files = await fs.readdir(blogDirectory);

    // Filter out system files or assets (images, etc.) if any accidentally live there
    const validFiles = files.filter(file => {
      const lower = file.toLowerCase();
      // Ignore common non-page assets just in case
      return !['.ds_store', '.jpg', '.png', '.webp', '.svg', '.css', '.js'].some(ext => lower.endsWith(ext));
    });

    // Map files to sitemap objects
    blogPages = await Promise.all(
      validFiles.map(async (file) => {
        // Get file stats for "lastModified" (SEO Win)
        const filePath = path.join(blogDirectory, file);
        const stats = await fs.stat(filePath);

        // Remove file extension for the URL (e.g., "guide.html" -> "guide")
        // If it's a folder, it keeps the name as is.
        const slug = file.replace(/\.(md|mdx|html|json|txt)$/, '');

        return {
          url: `${baseUrl}/blog/${slug}`,
          lastModified: stats.mtime, // Uses the actual file update time
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      })
    );

  } catch (error) {
    console.error("Sitemap Error: Could not read public/blog directory.", error);
    // Continue with just static pages so the build doesn't crash
  }

  // 3. Combine and Return
  return [...staticPages, ...blogPages];
}

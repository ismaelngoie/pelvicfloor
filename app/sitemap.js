import { promises as fs } from 'fs';
import path from 'path';

export default async function sitemap() {
  const baseUrl = 'https://pelvi.health';
   
  // 1. Define Static Pages (The Core App)
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // 2. Dynamic Blog Posts (Read from public/blog)
  let blogPages = [];
   
  try {
    const blogDirectory = path.join(process.cwd(), 'public/blog');
    
    // Check if directory exists first to avoid crash
    try {
        await fs.access(blogDirectory);
    } catch {
        console.warn("⚠️ Sitemap Warning: 'public/blog' folder not found. Skipping blog posts.");
        return staticPages;
    }

    const files = await fs.readdir(blogDirectory);

    // Filter valid files (ignore system files & assets)
    const validFiles = files.filter(file => {
      const lower = file.toLowerCase();
      const isSystemFile = ['.ds_store', 'thumbs.db'].some(ext => lower.includes(ext));
      const isAsset = ['.jpg', '.png', '.webp', '.svg', '.css', '.js'].some(ext => lower.endsWith(ext));
      return !isSystemFile && !isAsset;
    });

    // Generate Sitemap Entries
    blogPages = await Promise.all(
      validFiles.map(async (file) => {
        const filePath = path.join(blogDirectory, file);
        const stats = await fs.stat(filePath);

        // Clean slug: remove extension (e.g. "my-post.html" -> "my-post")
        const slug = file.replace(/\.(html|md|mdx|json|txt)$/, '');

        return {
          url: `${baseUrl}/blog/${slug}`,
          lastModified: stats.mtime, // Uses file's actual "Modified Time"
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      })
    );

  } catch (error) {
    console.error("Sitemap Generation Error:", error);
  }

  return [...staticPages, ...blogPages];
}

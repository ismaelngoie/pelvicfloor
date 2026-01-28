export const dynamic = "force-static";

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

  // 2. Dynamic Blog Posts (Scan Directories)
  let blogPages = [];
  
  try {
    // Read the main blog folder
    const entries = await fs.readdir(blogDirectory, { withFileTypes: true });

    // Filter for DIRECTORIES only (since your blogs are folders like /blog/my-post/)
    const blogFolders = entries.filter(entry => entry.isDirectory());

    // Map folders to sitemap entries
    blogPages = await Promise.all(
      blogFolders.map(async (folder) => {
        const folderName = folder.name;
        
        // Skip any hidden system folders or asset folders if they exist
        if (folderName.startsWith('.') || folderName === '_astro') return null;

        // Path to the index.html inside that folder
        const indexHtmlPath = path.join(blogDirectory, folderName, 'index.html');
        
        let lastModified = new Date(); // Default to today
        
        try {
            // Try to get the actual modification time of index.html
            const stats = await fs.stat(indexHtmlPath);
            lastModified = stats.mtime;
        } catch (err) {
            // If index.html doesn't exist, this might not be a valid blog folder
            // console.warn(`Skipping ${folderName}: No index.html found`);
            return null;
        }

        return {
          url: `${baseUrl}/blog/${folderName}`, // URL is /blog/folder-name
          lastModified: lastModified,
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      })
    );

    // Filter out any nulls (folders without index.html)
    blogPages = blogPages.filter(Boolean);

  } catch (error) {
    console.error("Sitemap Error: Could not read public/blog directory.", error);
  }

  // 3. Combine and Return
  return [...staticPages, ...blogPages];
}

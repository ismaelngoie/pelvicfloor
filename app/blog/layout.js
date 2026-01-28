import Script from "next/script";
import Link from "next/link";
import Image from "next/image"; // OPTIMIZATION: Critical for Google Speed Scores
import { ChevronRight, Search, ShieldCheck, Star } from "lucide-react";

// --- 1. ADVANCED BLOG METADATA ---
export const metadata = {
  metadataBase: new URL('https://pelvi.health'),
  title: {
    template: "%s | Pelvi Health Blog",
    default: "Pelvic Health Blog | Expert Advice for Leaks & Intimacy",
  },
  description: "Physio-approved guides on pelvic floor exercises, postpartum recovery, and stopping bladder leaks. Medically reviewed strategies for men and women.",
  
  // SEO SUPERCHARGE: Tell Google to show big images in search results
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pelvi.health/blog",
    siteName: "Pelvi Health Blog",
    images: [
      {
        url: '/og-blog-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Pelvic Health Insights',
      },
    ],
  },
  alternates: {
    canonical: 'https://pelvi.health/blog',
    // RSS Feed for discovery
    types: {
      'application/rss+xml': 'https://pelvi.health/feed.xml',
    },
  },
};

export default function BlogLayout({ children }) {
  
  // --- 2. JSON-LD SCHEMAS (THE SEO SECRET SAUCE) ---
  
  // A. ORGANIZATION (Trust Signal)
  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Pelvi Health",
    "url": "https://pelvi.health",
    "logo": "https://pelvi.health/logo.png",
    "sameAs": [
      "https://twitter.com/pelvihealth",
      "https://instagram.com/pelvihealth"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-0123", 
      "contactType": "customer service"
    }
  };

  // B. BREADCRUMBS (Site Structure)
  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://pelvi.health"
    },{
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://pelvi.health/blog"
    }]
  };

  // C. SITELINKS SEARCH BOX (Dominating Search Real Estate)
  // This tells Google to put a search bar under your link in the results
  const jsonLdSearchBox = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://pelvi.health/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://pelvi.health/blog?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className="w-full flex flex-col">
      
      {/* INJECT SCHEMAS */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSearchBox) }}
      />

      {/* --- 3. BLOG HEADER --- */}
      <header className="w-full border-b border-gray-200 bg-white py-6 md:py-8 mb-8 px-6 md:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center text-sm text-gray-500 mb-2">
              <Link href="/" className="hover:text-[#E65473] transition-colors">Home</Link>
              <ChevronRight size={14} className="mx-1" />
              <span className="font-semibold text-gray-900">Blog</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A1A26] tracking-tight">
              Pelvic Health <span className="text-[#E65473]">Journal</span>
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base max-w-2xl">
              Clinically validated advice for core strength, intimacy, and recovery.
            </p>
          </div>

          {/* Search Bar */}
          <form action="/blog" method="GET" className="relative w-full md:w-64">
            <input 
              type="text" 
              name="q"
              placeholder="Search topics..." 
              className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#E65473] focus:ring-1 focus:ring-[#E65473] transition-all"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </form>
        </div>
      </header>

      {/* --- 4. MAIN LAYOUT GRID --- */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12 px-6 md:px-0 pb-20">
        
        {/* LEFT COLUMN: The Article Content */}
        <main className="lg:col-span-8 w-full">
          {children}
        </main>

        {/* RIGHT COLUMN: The "Money" Sidebar (Sticky) */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* WIDGET 1: CTA Card (Sticky Money Maker) */}
          <div className="bg-[#1A1A26] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden sticky top-8 z-10">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#E65473] rounded-full blur-[50px] opacity-30"></div>
             
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-3">
                 <div className="bg-white/10 p-2 rounded-lg">
                   <Star size={18} className="text-yellow-400 fill-yellow-400" />
                 </div>
                 <span className="text-sm font-bold text-white/80 uppercase tracking-wider">Free Tool</span>
               </div>
               
               <h3 className="text-xl font-bold mb-2">Build Your Personal Plan</h3>
               <p className="text-white/70 text-sm mb-6">
                 Answer 3 questions and get a custom 5-minute daily routine to stop leaks and improve core strength.
               </p>
               
               <Link 
                 href="/" 
                 className="block w-full py-3.5 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] rounded-xl font-bold text-center hover:scale-[1.02] transition-transform shadow-lg shadow-rose-500/20"
               >
                 Start My Plan
               </Link>
             </div>
          </div>

          {/* WIDGET 2: Trust Signals (E-E-A-T) */}
          {/* OPTIMIZATION: Swapped img for Next/Image for better Google Core Web Vitals */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
               <ShieldCheck size={24} className="text-green-500" />
               <h4 className="font-bold text-[#1A1A26]">Medically Reviewed</h4>
             </div>
             <p className="text-sm text-gray-500 leading-relaxed">
               All articles are reviewed by certified pelvic floor physiotherapists to ensure clinical accuracy and safety.
             </p>
             <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
               <div className="w-10 h-10 relative rounded-full overflow-hidden bg-gray-100">
                 <Image 
                   src="/coachMiaAvatar.png" 
                   alt="Medical Reviewer Mia" 
                   fill
                   className="object-cover"
                   sizes="40px"
                 />
               </div>
               <div>
                 <p className="text-xs font-bold text-[#1A1A26]">Reviewed by Mia</p>
                 <p className="text-[10px] text-gray-400">Certified PT, Pelvi Health</p>
               </div>
             </div>
          </div>

          {/* WIDGET 3: Categories */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h4 className="font-bold text-[#1A1A26] mb-4">Trending Topics</h4>
            <div className="flex flex-wrap gap-2">
              {['Postpartum', 'Incontinence', 'Intimacy', 'Men\'s Health', 'Core Strength'].map((tag) => (
                <Link 
                  key={tag}
                  href={`/blog/category/${tag.toLowerCase().replace(" ", "-")}`}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-[#E65473]/10 hover:text-[#E65473] text-gray-600 text-xs font-medium rounded-full transition-colors border border-gray-200"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}

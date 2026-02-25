// app/cora/contact/page.js
// Cora — Contact / Support Page

export const metadata = {
  title: "Contact & Support | Cora",
  description: "Get help with Cora: AI Calorie & Food Log. Reach our support team.",
  robots: { index: true, follow: true },
};

export default function CoraContact() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
            <svg
              className="h-8 w-8 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Contact &amp; Support
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Cora: AI Calorie &amp; Food Log
          </p>
        </div>

        {/* Email Card */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Email Us</h2>
          <p className="mt-2 text-gray-500">
            Bug reports, feature requests, questions — we read everything.
          </p>
          <a
            href="mailto:support@pelvi.health"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.98]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            contact@pelvi.health
          </a>
          <p className="mt-4 text-sm text-gray-400">We typically respond within 24 hours.</p>
        </div>

        {/* FAQ */}
        <div className="mt-10 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Common Questions</h2>

          <details className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-base font-medium text-gray-900">
              Is Cora really free?
              <svg className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </summary>
            <p className="px-6 pb-4 text-gray-500">
              Yes. No subscriptions, no in-app purchases, no premium tiers, no paywalls. Every
              feature is free for everyone.
            </p>
          </details>

          <details className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-base font-medium text-gray-900">
              Where is my data stored?
              <svg className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </summary>
            <p className="px-6 pb-4 text-gray-500">
              On your phone only. We don&apos;t have servers or a database. Uninstalling the app
              deletes everything permanently.
            </p>
          </details>

          <details className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-base font-medium text-gray-900">
              How does the AI food scanner work?
              <svg className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </summary>
            <p className="px-6 pb-4 text-gray-500">
              Take a photo of any meal and Cora&apos;s AI instantly estimates calories, protein,
              carbs, and fat. The photo is processed through Google Gemini and is never stored on any
              server.
            </p>
          </details>

          <details className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-base font-medium text-gray-900">
              Can I export my data?
              <svg className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </summary>
            <p className="px-6 pb-4 text-gray-500">
              Yes. Cora generates PDF reports you can share or save to your files.
            </p>
          </details>

          <details className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-base font-medium text-gray-900">
              How do I delete all my data?
              <svg className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </summary>
            <p className="px-6 pb-4 text-gray-500">
              Go to Settings inside the app and tap &ldquo;Delete All Data.&rdquo; Or just uninstall
              the app — since nothing is stored on our end, it&apos;s all gone.
            </p>
          </details>
        </div>

        {/* Footer */}
        <div className="mt-14 rounded-xl border border-gray-200 bg-gray-50 px-6 py-5 text-center">
          <p className="text-sm text-gray-500">
            Cora is a wellness tracking tool, not a medical device. Always consult your healthcare
            provider for medical advice and treatment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

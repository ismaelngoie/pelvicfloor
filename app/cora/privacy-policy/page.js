// app/cora/privacy-policy/page.js
// Cora — Privacy Policy (comprehensive, Apple Review compliant)

export const metadata = {
  title: "Privacy Policy | Cora",
  description: "Privacy Policy for Cora: AI Calorie & Food Log iOS app.",
  robots: { index: true, follow: true },
};

export default function CoraPrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Cora: AI Calorie &amp; Food Log
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Effective Date: March 6, 2026 · Pelvi Health, LLC
          </p>
        </div>

        {/* Body */}
        <div className="prose prose-gray prose-lg max-w-none [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_li]:text-gray-600 [&_ul]:pl-5 [&_ul]:list-disc">

          <p className="rounded-xl bg-emerald-50 px-5 py-4 !text-emerald-800 font-medium border border-emerald-100">
            <strong>Summary:</strong> Your health data is stored on your device and your iCloud account.
            We do not have servers or databases. The only external services Cora uses are Google Gemini AI
            (for food photo analysis, with your consent) and Open Food Facts (for barcode lookups).
          </p>

          {/* 1 */}
          <h2>1. Data We Collect</h2>
          <p>
            Cora collects only the data you provide directly within the app to enable its health tracking features:
          </p>
          <ul>
            <li><strong>Profile Information:</strong> Name, age, gender, height, and profile photo (optional). Used to personalize your experience.</li>
            <li><strong>Nutrition Data:</strong> Food entries (name, calories, protein, carbs, fat), meal photos, meal times, and portion sizes.</li>
            <li><strong>Hydration Data:</strong> Water intake amounts, container types, and timestamps.</li>
            <li><strong>Weight Data:</strong> Weight entries with dates and units (kg/lbs).</li>
            <li><strong>Medication Data:</strong> Medication names, dosages, frequencies, schedule times, and adherence logs.</li>
            <li><strong>Cycle Data:</strong> Period start/end dates, flow levels, symptoms, mood, and energy levels.</li>
            <li><strong>Chat Messages:</strong> Conversations with Cora AI coach (stored on-device only).</li>
            <li><strong>Food Photos:</strong> Photos taken or selected for AI nutrition analysis.</li>
          </ul>
          <p>
            Cora does <strong>not</strong> collect your email address, phone number, precise location,
            contacts, browsing history, or any data beyond what you explicitly enter.
          </p>

          {/* 2 */}
          <h2>2. How Data Is Stored</h2>
          <p>
            All your health data is stored locally on your device using Apple&apos;s SwiftData framework.
            If you have iCloud enabled for Cora, your data syncs across your Apple devices via Apple&apos;s
            CloudKit using your personal iCloud account. This is governed by{" "}
            <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline underline-offset-2">
              Apple&apos;s Privacy Policy
            </a>. Pelvi Health does not have access to your iCloud data.
          </p>
          <p>
            Cora does not operate its own servers or cloud databases. We do not store any of your
            health data on Pelvi Health servers.
          </p>

          {/* 3 */}
          <h2>3. AI Food Scanner &amp; Third-Party Data Sharing</h2>
          <p className="rounded-xl bg-amber-50 px-5 py-4 !text-amber-900 font-medium border border-amber-100">
            <strong>Important:</strong> Cora asks for your explicit consent before sending any data
            to the AI service. You can use the app without the AI scanner.
          </p>
          <p>
            When you use the <strong>AI food scanner</strong>, Cora sends only the food photo you
            capture or select to <strong>Google Gemini AI</strong> (via Firebase Vertex AI) to identify
            foods and estimate nutritional values.
          </p>
          <ul>
            <li><strong>What is sent:</strong> Only the food photo. No personal information (name, age, health data, location) is included.</li>
            <li><strong>Who receives it:</strong> Google Gemini AI via Firebase Vertex AI.</li>
            <li><strong>How it&apos;s protected:</strong> Photos are transmitted over an encrypted (TLS) connection. Per Google&apos;s data processing terms, API inputs are not used to train Google&apos;s models.</li>
            <li><strong>Your control:</strong> You are asked for explicit consent before your first AI scan. You can revoke consent at any time in Settings. You can always log food manually or via barcode without AI.</li>
          </ul>
          <p>
            Google&apos;s privacy policy:{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline underline-offset-2">
              policies.google.com/privacy
            </a>
          </p>
          <p>
            Firebase data processing terms:{" "}
            <a href="https://firebase.google.com/terms/data-processing-terms" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline underline-offset-2">
              firebase.google.com/terms/data-processing-terms
            </a>
          </p>

          {/* 4 */}
          <h2>4. Barcode &amp; Food Search</h2>
          <p>
            When you scan a barcode or search for a food product, the barcode number or search query
            is sent to <strong>Open Food Facts</strong>, a free and open-source food database. No
            personal information, device identifiers, or health data is sent.
          </p>
          <p>
            Open Food Facts privacy policy:{" "}
            <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline underline-offset-2">
              world.openfoodfacts.org/privacy
            </a>
          </p>

          {/* 5 */}
          <h2>5. Analytics</h2>
          <p>
            Cora uses <strong>Clarity by Microsoft</strong> to collect anonymous usage analytics
            (screen views, session duration, interaction patterns). This is used solely to understand
            how users navigate the app and improve the experience. No personal health data, food logs,
            photos, or identifiable information is shared with Clarity.
          </p>
          <p>
            Clarity privacy policy:{" "}
            <a href="https://clarity.microsoft.com/terms" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline underline-offset-2">
              clarity.microsoft.com/terms
            </a>
          </p>

          {/* 6 */}
          <h2>6. Apple HealthKit</h2>
          <p>
            If you enable HealthKit integration, Cora may read active energy (calories burned) and
            weight data from Apple Health, and may write weight data back. This requires your explicit
            permission. HealthKit integration is off by default. Cora never shares HealthKit data with
            third parties, advertising platforms, or data brokers, in compliance with Apple&apos;s
            HealthKit guidelines.
          </p>

          {/* 7 */}
          <h2>7. No Ads &amp; No Tracking</h2>
          <p>
            Cora contains zero advertisements. We do not use advertising SDKs, tracking pixels,
            social media SDKs, or data brokers. We do not sell your data to anyone.
          </p>

          {/* 8 */}
          <h2>8. Deleting Your Data</h2>
          <p>
            Since everything is stored on your device and your iCloud account, you have full control.
            Use the &ldquo;Delete All Data&rdquo; option in Settings, or uninstall the app. To remove
            iCloud-synced data, go to Settings &gt; [Your Name] &gt; iCloud &gt; Manage Storage &gt; Cora.
          </p>

          {/* 9 */}
          <h2>9. Children&apos;s Privacy</h2>
          <p>
            Cora is not directed at children under 13. We do not knowingly collect personal information
            from children.
          </p>

          {/* 10 */}
          <h2>10. Your Rights</h2>
          <p>You may:</p>
          <ul>
            <li>Access all data stored by the app (on-device at any time)</li>
            <li>Delete all your data (Settings &gt; Delete All Data)</li>
            <li>Export your data (PDF export feature in the app)</li>
            <li>Opt out of AI food analysis (revoke consent in Settings or log manually)</li>
            <li>Disable iCloud sync (iOS Settings &gt; iCloud)</li>
          </ul>

          {/* 11 */}
          <h2>11. Changes to This Policy</h2>
          <p>
            If anything changes, we&apos;ll update this page. Material changes will be communicated
            through an in-app notice.
          </p>

          {/* 12 */}
          <h2>12. Contact</h2>
          <p>
            Questions? Reach us at{" "}
            <a href="mailto:contact@pelvi.health" className="text-rose-600 underline underline-offset-2">
              contact@pelvi.health
            </a>
          </p>

          {/* Footer */}
          <div className="!mt-16 rounded-xl border border-gray-200 bg-gray-50 px-6 py-5 text-center">
            <p className="!text-sm !text-gray-500 !mb-0">
              Cora is a wellness tracking tool, not a medical device. Nutrition estimates are generated
              by AI and referenced against USDA FoodData Central. Always consult your healthcare provider
              for medical advice and treatment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

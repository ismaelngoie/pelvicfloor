// app/cora/privacy-policy/page.js
// Cora — Privacy Policy (zero data collection)

export const metadata = {
  title: "Privacy Policy | Cora Health",
  description: "Privacy Policy for Cora: Heart Rate & BP Tracker iOS app.",
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
            Cora: Heart Rate &amp; BP Tracker
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Last updated: February 22, 2026
          </p>
        </div>

        {/* Body */}
        <div className="prose prose-gray prose-lg max-w-none [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_li]:text-gray-600 [&_ul]:pl-5 [&_ul]:list-disc">

          <p className="rounded-xl bg-emerald-50 px-5 py-4 !text-emerald-800 font-medium border border-emerald-100">
            <strong>The short version:</strong> We don&apos;t collect your data. We don&apos;t have
            a database. We don&apos;t have servers. Everything stays on your phone.
          </p>

          {/* 1 */}
          <h2>1. We Collect Nothing</h2>
          <p>
            Cora does not collect, store, or transmit any personal data. We do not have a database.
            We do not have servers. We do not have user accounts. We do not track you.
          </p>
          <p>
            All of your health data — blood pressure readings, heart rate measurements, blood sugar
            levels, weight entries, food logs, hydration records, cycle tracking data, medication
            logs, and profile information — is stored exclusively on your device. When you delete the
            app, all of your data is permanently gone.
          </p>

          {/* 2 */}
          <h2>2. Camera Usage</h2>
          <p>
            Cora uses your camera and flashlight to measure heart rate. Your fingertip is illuminated
            by the flash, and the camera detects blood flow variations to calculate your pulse. No
            photos or video are captured, saved, or transmitted. The camera feed is processed in
            real-time on your device and immediately discarded.
          </p>

          {/* 3 */}
          <h2>3. Apple Health</h2>
          <p>
            If you choose to connect Apple Health, Cora can read and write health data (blood
            pressure, heart rate, blood glucose, weight, steps, active energy) with your permission.
            This stays between your device and Apple. We never see it.
          </p>

          {/* 4 */}
          <h2>4. AI Health Coach &amp; Food Scanner</h2>
          <p>
            Cora includes an AI coach and a food photo scanner powered by Google Gemini through
            Firebase AI. This is the only external service Cora uses.
          </p>
          <p>
            When you ask the AI coach a question or snap a food photo, your message (along with
            basic health context like recent readings) is sent to Google&apos;s Gemini API to
            generate a response. The response is returned to your device. That&apos;s it.
          </p>
          <p>
            We do not store these conversations on any server. Your chat history lives on your phone
            only. Google&apos;s handling of AI requests is governed by{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 underline underline-offset-2"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </p>

          {/* 5 */}
          <h2>5. No Ads. No Tracking. No Analytics.</h2>
          <p>
            Cora contains zero advertisements. We do not use any analytics SDKs, tracking pixels, or
            third-party data collection tools. We do not know who you are, how often you open the
            app, or what features you use. We have no way of knowing.
          </p>

          {/* 6 */}
          <h2>6. No Subscriptions</h2>
          <p>
            Cora is 100% free. No in-app purchases, no subscriptions, no premium tiers, no paywalls.
            Every feature is available to every user at no cost.
          </p>

          {/* 7 */}
          <h2>7. Deleting Your Data</h2>
          <p>
            Since everything is stored on your device, you have full control. Use the &ldquo;Delete
            All Data&rdquo; option in Settings, or simply uninstall the app. There is nothing on our
            end to delete because we never had it.
          </p>

          {/* 8 */}
          <h2>8. Children&apos;s Privacy</h2>
          <p>
            Cora is not directed at children under 13. Since we collect no data from anyone, we
            certainly collect no data from children.
          </p>

          {/* 9 */}
          <h2>9. Changes to This Policy</h2>
          <p>
            If anything changes, we&apos;ll update this page. But our philosophy won&apos;t change:
            your health data is yours and yours alone.
          </p>

          {/* 10 */}
          <h2>10. Contact</h2>
          <p>
            Questions? Reach us at{" "}
            <a
              href="mailto:support@pelvi.health"
              className="text-rose-600 underline underline-offset-2"
            >
              support@pelvi.health
            </a>
          </p>

          {/* Footer */}
          <div className="!mt-16 rounded-xl border border-gray-200 bg-gray-50 px-6 py-5 text-center">
            <p className="!text-sm !text-gray-500 !mb-0">
              Cora is a health tracking and education tool, not a medical device. Always consult your
              healthcare provider for medical advice and treatment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

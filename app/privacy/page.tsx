export const metadata = {
  title: "Privacy Policy — HeyPuja",
  description: "How HeyPuja collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fffbf5" }}>
      {/* Header */}
      <header className="border-b px-6 py-4" style={{ borderColor: "#fed7aa", backgroundColor: "white" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/" className="text-xl font-black" style={{ color: "#f97316" }}>🪔 HeyPuja</a>
          <a href="/" className="text-sm font-semibold" style={{ color: "#f97316" }}>← Back to Home</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-black" style={{ color: "#1c1917" }}>Privacy Policy</h1>
        <p className="mb-10 text-sm" style={{ color: "#78716c" }}>Last updated: April 2026</p>

        <div className="space-y-8 text-base leading-relaxed" style={{ color: "#44403c" }}>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>1. Who We Are</h2>
            <p>
              HeyPuja ("we", "us", or "our") is a platform that connects customers with verified priests for
              religious ceremonies across India. Our website is <strong>heypuja.in</strong> and our mobile app
              is available on iOS and Android. We are operated as a sole proprietorship.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Account information:</strong> Name, phone number, and optionally email address when you sign up.</li>
              <li><strong>Booking details:</strong> Ceremony type, date, time, and address you provide when booking a priest.</li>
              <li><strong>Payment information:</strong> We do not store card or UPI details. Payments are processed securely by Razorpay. We only retain the booking amount and payment status.</li>
              <li><strong>Priest profile data:</strong> For priests who register, we collect name, phone, city, experience, ceremonies offered, bio, pricing, and a profile photo.</li>
              <li><strong>Device information:</strong> Push notification token (to send booking alerts), device type, and OS version.</li>
              <li><strong>Location:</strong> City-level location to show nearby priests, only if you grant permission.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, and app interactions, collected anonymously to improve the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>3. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>To match you with available priests in your city.</li>
              <li>To process bookings and send confirmation notifications.</li>
              <li>To send priests notifications about new booking requests.</li>
              <li>To facilitate payment processing via our payment provider.</li>
              <li>To allow priests and customers to contact each other via phone.</li>
              <li>To improve our platform, fix bugs, and develop new features.</li>
              <li>To respond to support requests.</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>4. Data Sharing</h2>
            <p className="mb-3">We share your data only in the following limited circumstances:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>With priests:</strong> When you book a ceremony, the priest receives your name and phone number to coordinate the booking.</li>
              <li><strong>With customers:</strong> Priests' names, phone numbers, cities, and ceremony details are visible to users browsing the platform.</li>
              <li><strong>Supabase:</strong> Our database provider (supabase.com) stores all platform data securely.</li>
              <li><strong>Razorpay:</strong> Our payment provider processes payment transactions. Their privacy policy applies to payment data.</li>
              <li><strong>Expo:</strong> Used for push notification delivery on mobile devices.</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect the rights and safety of our users.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>5. Data Retention</h2>
            <p>
              We retain your account and booking data for as long as your account is active or as needed to provide
              services. Booking records are kept for up to 3 years for accounting and dispute resolution purposes.
              You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate information.</li>
              <li>Request deletion of your account and data.</li>
              <li>Withdraw consent for push notifications at any time through your device settings.</li>
              <li>Withdraw consent for location access at any time through your device settings.</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, email us at{" "}
              <a href="mailto:support@heypuja.app" style={{ color: "#f97316" }}>support@heypuja.app</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>7. Security</h2>
            <p>
              We use industry-standard security measures including encrypted connections (HTTPS/TLS), secure
              database access controls via Supabase Row Level Security, and we never store plain-text passwords.
              However, no method of transmission over the internet is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>8. Children's Privacy</h2>
            <p>
              HeyPuja is not directed at children under 13. We do not knowingly collect personal information
              from children. If you believe a child has provided us with personal information, please contact
              us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the "Last updated"
              date at the top of this page. Continued use of HeyPuja after changes constitutes acceptance of
              the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or how we handle your data, contact us at:
            </p>
            <div className="mt-3 rounded-xl border p-4" style={{ borderColor: "#fed7aa", backgroundColor: "white" }}>
              <p className="font-semibold" style={{ color: "#1c1917" }}>HeyPuja</p>
              <p>Email: <a href="mailto:support@heypuja.app" style={{ color: "#f97316" }}>support@heypuja.app</a></p>
              <p>Website: <a href="https://heypuja.in" style={{ color: "#f97316" }}>heypuja.in</a></p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm" style={{ borderColor: "#fed7aa", color: "#a8a29e" }}>
        © 2026 HeyPuja. All rights reserved. ·{" "}
        <a href="/terms" style={{ color: "#f97316" }}>Terms of Service</a>
      </footer>
    </div>
  );
}

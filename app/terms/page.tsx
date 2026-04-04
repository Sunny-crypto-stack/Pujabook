export const metadata = {
  title: "Terms of Service — HeyPuja",
  description: "Terms and conditions for using HeyPuja.",
};

export default function TermsPage() {
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
        <h1 className="mb-2 text-4xl font-black" style={{ color: "#1c1917" }}>Terms of Service</h1>
        <p className="mb-10 text-sm" style={{ color: "#78716c" }}>Last updated: April 2026</p>

        <div className="space-y-8 text-base leading-relaxed" style={{ color: "#44403c" }}>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using HeyPuja (the "Service"), you agree to be bound by these Terms of Service.
              If you do not agree, please do not use our platform. These terms apply to all users — customers
              who book ceremonies and priests who offer their services.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>2. What HeyPuja Is</h2>
            <p>
              HeyPuja is a marketplace platform that connects customers with independent priests for religious
              ceremonies. HeyPuja itself is not a religious services provider — we facilitate introductions and
              bookings between customers and priests who are independent service providers. The quality,
              conduct, and outcome of any ceremony is the responsibility of the individual priest.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>3. Accounts</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for keeping your account credentials secure.</li>
              <li>You must be at least 18 years old to create an account.</li>
              <li>One person may not maintain multiple accounts.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>4. Bookings and Payments</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Bookings are confirmed only after successful payment processing.</li>
              <li>Prices are set by individual priests and displayed at the time of booking.</li>
              <li>Payments are processed by our third-party payment provider (Razorpay). By paying, you also agree to their terms.</li>
              <li>HeyPuja collects a service fee on each transaction to maintain the platform.</li>
              <li>All prices are in Indian Rupees (INR) unless otherwise stated.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>5. Cancellation & Refunds</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Free cancellation:</strong> Cancel more than 24 hours before the ceremony for a full refund.</li>
              <li><strong>Late cancellation:</strong> Cancellations within 24 hours of the ceremony may be subject to a 50% cancellation fee.</li>
              <li><strong>No-shows:</strong> If the customer is not available at the agreed time and location, no refund will be issued.</li>
              <li><strong>Priest cancellations:</strong> If a priest cancels, you will receive a full refund and we will assist in finding an alternative priest.</li>
              <li>Refunds are processed to the original payment method within 5–7 business days.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>6. Priest Responsibilities</h2>
            <p className="mb-3">Priests who register on HeyPuja agree to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide accurate information about their qualifications, experience, and services offered.</li>
              <li>Honor confirmed bookings and arrive on time.</li>
              <li>Conduct themselves professionally and respectfully with customers.</li>
              <li>Not solicit customers for off-platform transactions to avoid HeyPuja fees.</li>
              <li>Maintain current contact information and availability.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>7. Prohibited Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide false or misleading information.</li>
              <li>Use the platform to harass, abuse, or harm other users.</li>
              <li>Attempt to circumvent the platform's payment system.</li>
              <li>Scrape, copy, or redistribute platform data without permission.</li>
              <li>Use the platform for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>8. Limitation of Liability</h2>
            <p>
              HeyPuja provides the platform "as is" without warranties of any kind. We are not liable for
              the quality of ceremonies performed, disputes between customers and priests, or any indirect,
              incidental, or consequential damages arising from the use of our platform. Our total liability
              to you shall not exceed the amount you paid for the specific booking in question.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>9. Intellectual Property</h2>
            <p>
              All content on the HeyPuja platform — including the name, logo, design, and software — is owned
              by HeyPuja. You may not reproduce, distribute, or create derivative works without our written
              permission. Priests and customers retain ownership of content they submit (reviews, photos, etc.)
              but grant HeyPuja a license to display it on the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of India. Any disputes arising from the use of HeyPuja
              shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>11. Changes to Terms</h2>
            <p>
              We may update these Terms of Service at any time. We will notify users of significant changes
              via email or in-app notification. Continued use after changes constitutes acceptance of the
              new terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold" style={{ color: "#1c1917" }}>12. Contact</h2>
            <p>For questions about these terms:</p>
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
        <a href="/privacy" style={{ color: "#f97316" }}>Privacy Policy</a>
      </footer>
    </div>
  );
}

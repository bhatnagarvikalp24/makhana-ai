import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-500 hover:text-green-600 mb-8 transition-all duration-300 group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform"/> Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-green-100 p-3 rounded-xl">
              <Shield className="text-green-600" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
              <p className="text-gray-500 mt-1">Last updated: December 18, 2024</p>
            </div>
          </div>

          <div className="prose prose-green max-w-none space-y-6 text-gray-700">

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                Welcome to Ghar-Ka-Khana ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered diet planning service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
              <p className="leading-relaxed mb-3">We collect the following personal information that you voluntarily provide:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name</li>
                <li>Phone number</li>
                <li>Email address (optional)</li>
                <li>Age, gender, height, and weight</li>
                <li>Health goals and dietary preferences</li>
                <li>Regional cuisine preferences</li>
                <li>Medical information (optional, from blood reports)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Health Information</h3>
              <p className="leading-relaxed">
                If you choose to upload blood reports, we process this information solely to generate personalized meal plans. <strong>Important:</strong> Blood report PDFs are processed in real-time and are NOT stored on our servers. The extracted health insights are saved only to customize your diet plan.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.3 Usage Data</h3>
              <p className="leading-relaxed">
                We automatically collect certain information when you use our service, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and location data</li>
                <li>Pages visited and features used</li>
                <li>Time and date of access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="leading-relaxed mb-3">We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Diet Plan Generation:</strong> To create personalized 7-day meal plans tailored to your health goals and preferences</li>
                <li><strong>Medical Intelligence:</strong> To analyze blood reports and suggest dietary adjustments for nutritional deficiencies</li>
                <li><strong>Account Management:</strong> To save and retrieve your diet plans when you log in</li>
                <li><strong>Service Improvement:</strong> To understand usage patterns and improve our AI algorithms</li>
                <li><strong>Communication:</strong> To send you plan updates and important service notifications</li>
                <li><strong>Security:</strong> To detect and prevent fraudulent or unauthorized activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Storage and Security</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Storage</h3>
              <p className="leading-relaxed mb-3">
                Your data is stored securely in encrypted databases. We use:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>PostgreSQL database with encryption at rest</li>
                <li>Secure cloud infrastructure (Render/Neon)</li>
                <li>Regular backups to prevent data loss</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Security Measures</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>HTTPS encryption for all data transmission</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and monitoring</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <p className="text-yellow-800 font-semibold">Important Note:</p>
                <p className="text-yellow-700 mt-1">
                  While we implement industry-standard security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
              <p className="leading-relaxed mb-3">We do NOT sell your personal information. We may share your data only in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Service Providers</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OpenAI:</strong> For AI-powered meal plan generation (anonymized data)</li>
                <li><strong>Razorpay:</strong> For payment processing (if applicable)</li>
                <li><strong>Cloud Hosting:</strong> For data storage and service delivery</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">5.2 Legal Requirements</h3>
              <p className="leading-relaxed">
                We may disclose your information if required by law, court order, or government regulation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="leading-relaxed mb-3">You have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to processing of your personal data</li>
              </ul>
              <p className="leading-relaxed mt-4">
                To exercise these rights, please contact us using the information in Section 10.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking</h2>
              <p className="leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience. You can control cookies through your browser settings. Disabling cookies may limit certain features of our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Links</h2>
              <p className="leading-relaxed">
                Our service may contain links to third-party websites (e.g., Blinkit for grocery shopping). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
              <p className="leading-relaxed">
                Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="leading-relaxed mb-3">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">Ghar-Ka-Khana Support</p>
                <p className="text-gray-700 mt-2">Website: <a href="/" className="text-green-600 hover:underline">https://gharkakhana.com</a></p>
                <p className="text-gray-700">Through our contact form or login page</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="bg-green-50 p-6 rounded-xl border border-green-200 mt-8">
              <h3 className="text-xl font-bold text-green-900 mb-3">Your Privacy Matters</h3>
              <p className="text-green-800 leading-relaxed">
                At Ghar-Ka-Khana, we take your privacy seriously. We are committed to transparency, security, and giving you control over your personal information. If you have any concerns, please don't hesitate to reach out.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

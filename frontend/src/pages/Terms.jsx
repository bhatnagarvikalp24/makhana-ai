import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
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
              <FileText className="text-green-600" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900">Terms of Service</h1>
              <p className="text-gray-500 mt-1">Last updated: December 18, 2024</p>
            </div>
          </div>

          <div className="prose prose-green max-w-none space-y-6 text-gray-700">

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing and using Ghar-Ka-Khana ("the Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="leading-relaxed mb-3">
                Ghar-Ka-Khana is an AI-powered diet planning platform that provides:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Personalized 7-day meal plans based on user-provided information</li>
                <li>Blood report analysis for nutritional deficiency detection</li>
                <li>Grocery list generation based on meal plans</li>
                <li>Regional Indian cuisine customization</li>
                <li>Diet plan storage and retrieval</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Eligibility</h2>
              <p className="leading-relaxed">
                You must be at least 18 years old to use this Service. By using Ghar-Ka-Khana, you represent and warrant that you meet this age requirement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Accounts</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Account Creation</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You may create an account using your phone number</li>
                <li>You are responsible for maintaining the confidentiality of your account information</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Account Termination</h3>
              <p className="leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Medical Disclaimer</h2>
              <div className="bg-red-50 border-l-4 border-red-500 p-6 my-4">
                <p className="text-red-800 font-bold text-lg mb-2">IMPORTANT MEDICAL DISCLAIMER</p>
                <ul className="text-red-700 space-y-2 list-disc pl-6">
                  <li>Ghar-Ka-Khana is NOT a substitute for professional medical advice, diagnosis, or treatment</li>
                  <li>Our AI-generated meal plans are for informational purposes only</li>
                  <li>Always consult with a qualified healthcare provider before making dietary changes</li>
                  <li>We do not provide medical advice or treatment recommendations</li>
                  <li>Blood report analysis is automated and may not catch all health issues</li>
                  <li>Individual results may vary; we make no guarantees about weight loss or health outcomes</li>
                </ul>
              </div>
              <p className="leading-relaxed mt-4">
                <strong>If you have any medical conditions, allergies, or are taking medications, consult your doctor before following any diet plan.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. User Responsibilities</h2>
              <p className="leading-relaxed mb-3">You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate health information</li>
                <li>Use the Service for lawful purposes only</li>
                <li>Not misuse or attempt to hack the Service</li>
                <li>Not share your account credentials with others</li>
                <li>Respect the intellectual property rights of Ghar-Ka-Khana</li>
                <li>Not use the Service to harm others or distribute malicious content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Our Content</h3>
              <p className="leading-relaxed">
                All content on Ghar-Ka-Khana, including text, graphics, logos, icons, software, and meal plans, is the property of Ghar-Ka-Khana or its licensors and is protected by copyright and intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.2 Your Content</h3>
              <p className="leading-relaxed">
                You retain ownership of any personal information you provide. By using our Service, you grant us a license to use this information to generate and improve meal plans.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.3 Generated Plans</h3>
              <p className="leading-relaxed">
                The meal plans generated for you are for your personal use only. You may download and print them, but you may not resell or redistribute them commercially without our permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Payment and Refunds</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Free Service</h3>
              <p className="leading-relaxed">
                Diet plan generation is currently provided free of charge. We reserve the right to introduce paid features in the future with prior notice.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">8.2 E-Commerce (Future)</h3>
              <p className="leading-relaxed">
                If we introduce grocery delivery or other paid services, separate terms and pricing will apply.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="leading-relaxed mb-3">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ghar-Ka-Khana is provided "AS IS" without warranties of any kind</li>
                <li>We do not guarantee the accuracy, completeness, or reliability of AI-generated content</li>
                <li>We are not liable for any health issues, weight changes, or allergic reactions resulting from following our meal plans</li>
                <li>We are not responsible for third-party services (e.g., Blinkit, payment processors)</li>
                <li>Our total liability to you shall not exceed ₹1,000 or the amount you paid us in the last 12 months, whichever is greater</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify and hold harmless Ghar-Ka-Khana, its officers, employees, and affiliates from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Privacy</h2>
              <p className="leading-relaxed">
                Your use of the Service is also governed by our <button onClick={() => navigate('/privacy')} className="text-green-600 hover:underline font-semibold">Privacy Policy</button>. Please review it to understand how we collect and use your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Modifications to Service</h2>
              <p className="leading-relaxed">
                We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to Terms</h2>
              <p className="leading-relaxed">
                We may revise these Terms at any time. The most current version will always be posted on this page with an updated "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts in Mumbai, India.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="leading-relaxed mb-3">
                For questions about these Terms, please contact us through:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">Ghar-Ka-Khana Legal</p>
                <p className="text-gray-700 mt-2">Website: <a href="/" className="text-green-600 hover:underline">https://gharkakhana.com</a></p>
                <p className="text-gray-700">Contact via our login page or website form</p>
              </div>
            </section>

            <section className="bg-green-50 p-6 rounded-xl border border-green-200 mt-8">
              <h3 className="text-xl font-bold text-green-900 mb-3">Agreement</h3>
              <p className="text-green-800 leading-relaxed">
                By using Ghar-Ka-Khana, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the Service immediately.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

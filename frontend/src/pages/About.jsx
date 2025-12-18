import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Brain, Users, Target, Sparkles, ChefHat } from 'lucide-react';

export default function About() {
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

          {/* Header */}
          <div className="text-center mb-12">
            <div className="bg-gradient-to-br from-green-600 to-green-500 p-4 rounded-2xl inline-block mb-6">
              <ChefHat className="text-white" size={48} />
            </div>
            <h1 className="text-5xl font-extrabold text-gray-900 mb-4">About Ghar-Ka-Khana</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Bringing AI-powered nutrition to every Indian household
            </p>
          </div>

          <div className="prose prose-green max-w-none space-y-8 text-gray-700">

            {/* Our Story */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Heart className="text-red-500" size={32} fill="currentColor" />
                Our Story
              </h2>
              <p className="leading-relaxed text-lg">
                Ghar-Ka-Khana was born from a simple observation: while there are countless diet apps available globally, very few understand the unique needs of Indian households. We believe that healthy eating shouldn't mean giving up the flavors you love or the regional cuisines you grew up with.
              </p>
              <p className="leading-relaxed text-lg mt-4">
                Our name, "Ghar-Ka-Khana" (Home-cooked Food), reflects our core philosophy: nutrition should feel like home. Whether you're from Punjab, Tamil Nadu, Gujarat, or Bengal, your diet plan should respect your culinary heritage while helping you achieve your health goals.
              </p>
            </section>

            {/* Mission */}
            <section className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Target className="text-green-600" size={32} />
                Our Mission
              </h2>
              <p className="leading-relaxed text-lg text-gray-800">
                To democratize personalized nutrition by making AI-powered diet planning accessible, affordable, and culturally relevant for every Indian. We're committed to helping millions lead healthier lives without compromising on taste or tradition.
              </p>
            </section>

            {/* What We Do */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Brain className="text-blue-600" size={32} />
                What Makes Us Different
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FeatureBox
                  icon={<Sparkles className="text-yellow-500" size={24} />}
                  title="AI-Powered Intelligence"
                  desc="Our advanced AI analyzes your unique profile, health goals, and medical data to create truly personalized meal plans."
                />
                <FeatureBox
                  icon={<ChefHat className="text-green-600" size={24} />}
                  title="Regional Expertise"
                  desc="From Gujarati theplas to South Indian dosas, we understand and respect the diversity of Indian cuisine."
                />
                <FeatureBox
                  icon={<Heart className="text-red-500" size={24} fill="currentColor" />}
                  title="Medical Intelligence"
                  desc="Upload your blood reports, and our AI detects nutritional deficiencies to adjust your diet accordingly."
                />
                <FeatureBox
                  icon={<Users className="text-purple-600" size={24} />}
                  title="Community First"
                  desc="We're building a platform that puts user privacy, health, and satisfaction above everything else."
                />
              </div>
            </section>

            {/* How It Works */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">How We Create Your Plan</h2>
              <div className="space-y-4">
                <StepBox
                  step="1"
                  title="You Share Your Details"
                  desc="Tell us about your age, weight, height, health goals, dietary preferences, and regional cuisine choices."
                />
                <StepBox
                  step="2"
                  title="Optional: Blood Report Analysis"
                  desc="Upload your blood report for deeper insights. Our AI detects deficiencies like low iron, Vitamin D, or high cholesterol."
                />
                <StepBox
                  step="3"
                  title="AI Generates Your Plan"
                  desc="Our AI processes 500+ Indian recipes and nutritional data to create a 7-day meal plan that's perfect for you."
                />
                <StepBox
                  step="4"
                  title="Get Grocery List & Start"
                  desc="Receive a consolidated shopping list, download your plan as PDF, and begin your healthy eating journey!"
                />
              </div>
            </section>

            {/* Our Values */}
            <section className="bg-gray-50 p-8 rounded-2xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Core Values</h2>
              <ul className="space-y-4">
                <ValueItem
                  title="Privacy First"
                  desc="Your health data is sacred. We encrypt everything and never sell your information."
                />
                <ValueItem
                  title="Cultural Respect"
                  desc="We honor India's culinary diversity and never force western diet trends on you."
                />
                <ValueItem
                  title="Scientific Accuracy"
                  desc="Our recommendations are based on nutritional science and medical research."
                />
                <ValueItem
                  title="Accessibility"
                  desc="Healthy eating should be affordable and accessible to everyone, everywhere."
                />
              </ul>
            </section>

            {/* The Team */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Built with Love in India</h2>
              <p className="leading-relaxed text-lg">
                Ghar-Ka-Khana is developed by a team of technologists, nutritionists, and food enthusiasts who believe that AI can make healthy living easier for millions of Indians. We're based in India, understand Indian needs, and are committed to serving our community.
              </p>
              <p className="leading-relaxed text-lg mt-4">
                Every meal plan, every feature, and every line of code is crafted with one goal: to help you eat better, feel better, and live better.
              </p>
            </section>

            {/* Join Us */}
            <section className="bg-gradient-to-r from-green-600 to-emerald-500 p-8 rounded-2xl text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
              <p className="text-lg mb-6 opacity-90">
                Be part of India's healthy eating revolution. Start your journey today!
              </p>
              <button
                onClick={() => navigate('/start')}
                className="bg-white text-green-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
              >
                <ChefHat size={24} />
                Create Your Free Plan
              </button>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

// Feature Box Component
function FeatureBox({ icon, title, desc }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

// Step Box Component
function StepBox({ step, title, desc }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="bg-gradient-to-br from-green-600 to-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
        {step}
      </div>
      <div>
        <h3 className="font-bold text-lg text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// Value Item Component
function ValueItem({ title, desc }) {
  return (
    <li className="flex gap-3 items-start">
      <div className="text-green-600 mt-1">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="text-gray-600">{desc}</p>
      </div>
    </li>
  );
}

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowRight, Activity, CheckCircle, Brain, Apple, ShoppingBag, Star, Users, Clock, Shield } from 'lucide-react';
import api from '../components/api';

export default function Landing() {
  const navigate = useNavigate();

  // Wake up backend on landing page load
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        await api.get('/health');
        console.log('✅ Backend is awake');
      } catch (error) {
        console.log('⚠️ Backend waking up...');
      }
    };
    wakeUpBackend();
  }, []);

  return (
    <div className="bg-gradient-to-b from-green-50 via-white to-green-50">

      {/* --- HERO SECTION --- */}
      <main className="max-w-6xl mx-auto px-4 pt-12 md:pt-20 pb-24 text-center">

        <div className="inline-flex items-center bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-5 py-2 rounded-full text-sm font-bold mb-8 shadow-sm border border-green-200 animate-bounce-slow">
            <Activity size={16} className="mr-2 animate-pulse" />
            AI-Powered Nutrition
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-slide-up">
          Eat Smarter, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Not Less.</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-delayed">
          Get a personalized 7-day meal plan based on your health goals,
          regional taste, and even your blood report.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-delayed-more">
            {/* MAIN CTA - STARTS NEW PLAN (No Login Required) */}
            <button
                onClick={() => navigate('/start')}
                className="bg-gradient-to-r from-green-600 to-green-500 text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center justify-center hover:from-green-700 hover:to-green-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 group"
            >
                Build Your Free Plan
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500 animate-fade-in-delayed-more">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span>100% Free</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span>No Sign-up Required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span>Privacy First</span>
          </div>
        </div>

        {/* --- FEATURES GRID --- */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 text-left max-w-5xl mx-auto">
            <FeatureCard
                icon={<Apple size={32} />}
                title="Regional Taste"
                desc="Whether you love Gujarati Dal or Punjabi Chole, we adapt to your kitchen."
                color="green"
            />
            <FeatureCard
                icon={<Brain size={32} />}
                title="Medical Intelligence"
                desc="Upload your blood report. Our AI detects deficiencies and suggests food fixes."
                color="blue"
            />
            <FeatureCard
                icon={<ShoppingBag size={32} />}
                title="Instant Grocery List"
                desc="Get a consolidated shopping list for your entire week in one click."
                color="purple"
            />
        </div>

        {/* --- WHY CHOOSE US --- */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Why Choose Ghar-Ka-Khana?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">AI-powered features that make healthy eating effortless</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard
              icon={<Brain size={28} />}
              label="Medical Intelligence"
              desc="Upload blood reports for AI-powered deficiency detection"
            />
            <BenefitCard
              icon={<ShoppingBag size={28} />}
              label="Budget Optimizer"
              desc="Smart grocery swaps to save money without compromising nutrition"
            />
            <BenefitCard
              icon={<Activity size={28} />}
              label="Meal Swapper"
              desc="Don't like a meal? Swap it instantly with macro-matched alternatives"
            />
            <BenefitCard
              icon={<CheckCircle size={28} />}
              label="100% Free"
              desc="No hidden costs, no subscriptions, always free"
            />
          </div>
        </div>

        {/* --- HOW IT WORKS --- */}
        <div className="mt-32 bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get your personalized diet plan in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Share Your Details"
              desc="Tell us your age, weight, goals, and regional food preferences. Upload blood reports for medical intelligence."
            />
            <StepCard
              step="2"
              title="AI Generates Plan"
              desc="AI analyzes your profile and creates a 7-day meal plan with YouTube recipe videos for each meal."
            />
            <StepCard
              step="3"
              title="Shop & Cook Smart"
              desc="Get grocery lists with budget optimization and smart swaps. Swap any meal you don't like instantly!"
            />
          </div>
        </div>

        {/* --- FINAL CTA --- */}
        <div className="mt-32 bg-gradient-to-r from-green-600 to-emerald-500 rounded-3xl p-12 text-center text-white shadow-2xl max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Ready to Transform Your Health?</h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90">Get your free personalized meal plan now</p>
          <button
            onClick={() => navigate('/start')}
            className="bg-white text-green-700 px-12 py-5 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 inline-flex items-center gap-3"
          >
            Start Your Journey
            <ArrowRight size={24} />
          </button>
        </div>

      </main>

    </div>
  );
}

// Enhanced Feature Card
function FeatureCard({ icon, title, desc, color }) {
    const colorMap = {
        green: 'text-green-500 bg-green-50',
        blue: 'text-blue-500 bg-blue-50',
        purple: 'text-purple-500 bg-purple-50'
    };

    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
            <div className={`${colorMap[color]} w-16 h-16 rounded-xl flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="font-bold text-xl text-gray-800 mb-3 group-hover:text-green-700 transition-colors">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{desc}</p>
        </div>
    );
}

// Benefit Card
function BenefitCard({ icon, label, desc }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="text-green-600 flex justify-center mb-4 transform group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">{label}</h3>
            <p className="text-sm text-gray-600 text-center leading-relaxed">{desc}</p>
        </div>
    );
}

// Step Card
function StepCard({ step, title, desc }) {
    return (
        <div className="text-center group">
            <div className="bg-gradient-to-br from-green-600 to-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                {step}
            </div>
            <h3 className="font-bold text-xl text-gray-800 mb-3">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{desc}</p>
        </div>
    );
}

// Testimonial Card
function TestimonialCard({ name, location, quote, rating }) {
    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex gap-1 mb-4">
                {[...Array(rating)].map((_, i) => (
                    <Star key={i} size={18} className="text-yellow-400 fill-yellow-400" />
                ))}
            </div>
            <p className="text-gray-700 leading-relaxed mb-6 italic">"{quote}"</p>
            <div className="flex items-center gap-3">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center text-green-700 font-bold text-lg">
                    {name.charAt(0)}
                </div>
                <div>
                    <div className="font-bold text-gray-800">{name}</div>
                    <div className="text-sm text-gray-500">{location}</div>
                </div>
            </div>
        </div>
    );
}

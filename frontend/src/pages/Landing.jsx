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
            Powered by Multi-Agent AI
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-slide-up">
          Smart AI That <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-blue-600 to-purple-600">Understands You.</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-delayed">
          Not just a diet app. An AI nutritionist that speaks your language, tastes your culture,
          and heals your body with intelligent meal planning.
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
                title="Regional Taste Intelligence"
                desc="From North Indian rotis to South Indian dosas - our AI understands 500+ regional dishes and adapts them to your health goals without losing authentic taste."
                color="green"
            />
            <FeatureCard
                icon={<Brain size={32} />}
                title="Medical Intelligence"
                desc="PCOS, diabetes, thyroid issues? Our AI agent automatically excludes harmful ingredients and suggests therapeutic alternatives backed by nutritional science."
                color="blue"
            />
            <FeatureCard
                icon={<ShoppingBag size={32} />}
                title="Smart Grocery + Budget Optimizer"
                desc="One-click grocery list with AI-powered price intelligence. Find cheaper alternatives and save 30-40% on your grocery bill without compromising nutrition."
                color="purple"
            />
        </div>

        {/* --- AI TECHNOLOGY SECTION --- */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
              Built on Cutting-Edge Generative AI
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Multi-Agent AI System</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI agents work together - one analyzes your health data, another curates regional recipes,
              and a third optimizes your grocery budget in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard
              icon={<Brain size={28} />}
              label="AI Health Analyst"
              desc="Medical AI agent that understands 15+ health conditions and blood report insights"
            />
            <BenefitCard
              icon={<Apple size={28} />}
              label="Regional Recipe AI"
              desc="Curates authentic dishes from your region while maintaining nutritional balance"
            />
            <BenefitCard
              icon={<ShoppingBag size={28} />}
              label="Budget Optimizer AI"
              desc="Compares prices, finds cheaper alternatives, and maximizes your grocery savings"
            />
            <BenefitCard
              icon={<Activity size={28} />}
              label="Adaptive Planning"
              desc="AI learns from your preferences and adjusts meal plans based on your feedback"
            />
          </div>
        </div>

        {/* --- WHY CHOOSE US --- */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Because Your Idli Shouldn't Become a Salad</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              AI that respects your cravings, understands your culture, and still gets you healthy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BenefitCard
              icon={<CheckCircle size={28} />}
              label="100% Free Forever"
              desc="No hidden costs, no subscriptions. AI-powered nutrition for everyone."
            />
            <BenefitCard
              icon={<Shield size={28} />}
              label="Privacy First"
              desc="Your health data stays private. We never sell or share your information."
            />
            <BenefitCard
              icon={<Clock size={28} />}
              label="Plans in 30 Seconds"
              desc="Generative AI creates personalized 7-day meal plans faster than you can say 'diet'."
            />
          </div>
        </div>

        {/* --- HOW IT WORKS --- */}
        <div className="mt-32 bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">From GPT to Your Plate</h2>
            <p className="text-xl text-gray-600">The future of nutrition, delivered in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="You Speak, AI Listens"
              desc="Tell us your age, weight, health goals, and regional food preferences. Upload blood reports and our medical AI analyzes them instantly."
            />
            <StepCard
              step="2"
              title="AI Agents Collaborate"
              desc="Our multi-agent AI system works together - analyzing your health, curating regional recipes, and creating a personalized 7-day meal plan with recipe videos."
            />
            <StepCard
              step="3"
              title="Smart Grocery + Cooking"
              desc="Get AI-optimized grocery lists with budget intelligence. Don't like a meal? Our AI swaps it with macro-matched alternatives instantly!"
            />
          </div>
        </div>

        {/* --- FINAL CTA --- */}
        <div className="mt-32 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">AI Nutrition, Made for India</h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Smart enough to plan meals. Wise enough to respect your cravings.
          </p>
          <button
            onClick={() => navigate('/start')}
            className="bg-white text-purple-700 px-12 py-5 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 inline-flex items-center gap-3"
          >
            Experience AI Magic
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

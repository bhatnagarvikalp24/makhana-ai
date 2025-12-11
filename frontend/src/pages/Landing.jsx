import { useNavigate } from 'react-router-dom';
import { ChefHat, ArrowRight, Activity, CheckCircle, LogIn } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      
      {/* --- HEADER --- */}
      <header className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="bg-green-600 p-2 rounded-lg text-white">
                <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Ghar-Ka-Khana</h1>
        </div>
        
        {/* LOGIN BUTTON - NAVIGATES TO /login */}
        <button 
            onClick={() => navigate('/login')}
            className="flex items-center text-green-700 font-semibold hover:bg-green-100 px-4 py-2 rounded-lg transition"
        >
            <LogIn size={18} className="mr-2"/> Login
        </button>
      </header>

      {/* --- HERO SECTION --- */}
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-24 text-center">
        
        <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Activity size={16} className="mr-2" />
            AI-Powered Nutrition
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Eat Smarter, <br/>
          <span className="text-green-600">Not Less.</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Get a personalized 7-day meal plan based on your health goals, 
          regional taste, and even your blood report.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
            {/* MAIN CTA - STARTS NEW PLAN (No Login Required) */}
            <button 
                onClick={() => navigate('/start')}
                className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-green-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
                Build Your Free Plan <ArrowRight className="ml-2" />
            </button>
        </div>

        {/* --- FEATURES GRID --- */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 text-left">
            <FeatureCard 
                title="Regional Taste" 
                desc="Whether you love Gujarati Dal or Punjabi Chole, we adapt to your kitchen."
            />
            <FeatureCard 
                title="Medical Intelligence" 
                desc="Upload your blood report. Our AI detects deficiencies and suggests food fixes."
            />
            <FeatureCard 
                title="Instant Grocery List" 
                desc="Get a consolidated shopping list for your entire week in one click."
            />
        </div>

      </main>
      
      {/* --- FOOTER --- */}
      <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
        <p>© 2024 AI Ghar-Ka-Diet. Made with 🥗 in India.</p>
      </footer>

    </div>
  );
}

// Simple Sub-component for features
function FeatureCard({ title, desc }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="text-green-500 mb-4">
                <CheckCircle size={24} />
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 leading-relaxed">{desc}</p>
        </div>
    );
}
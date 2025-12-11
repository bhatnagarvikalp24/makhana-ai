import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft, Store } from 'lucide-react';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center p-4 text-center">
      
      <div className="bg-white p-10 md:p-14 rounded-3xl shadow-2xl max-w-lg border-2 border-green-50 transform transition hover:scale-[1.02] duration-300">
        
        {/* Icon Animation */}
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <Store className="text-green-600" size={48} />
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          We're Building Something <span className="text-green-600">Huge!</span>
        </h1>

        <p className="text-xl text-gray-600 mb-8 leading-relaxed font-medium">
          Our own E-Commerce store is under construction. 
          <br className="hidden md:block" />
          <span className="text-green-700 font-bold block mt-2">
            Coming soon with everything at your doorstep! 🚀
          </span>
        </p>

        <div className="space-y-4">
            <button 
                onClick={() => navigate('/')}
                className="w-full bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition flex items-center justify-center shadow-lg"
            >
                <ArrowLeft size={20} className="mr-2"/> Back to Home
            </button>
            
            <p className="text-xs text-gray-400 mt-4">
                Till then, use the Blinkit links on the previous page!
            </p>
        </div>

      </div>
    </div>
  );
}
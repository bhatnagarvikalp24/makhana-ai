import { useNavigate } from 'react-router-dom';
import { ChefHat, Heart } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-green-600 to-green-500 p-2 rounded-xl text-white shadow-md">
                <ChefHat size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Ghar-Ka-Khana</h3>
                <p className="text-xs text-gray-500">AI-Powered Nutrition</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4 max-w-md">
              Your personal AI nutritionist that creates customized 7-day meal plans based on your health goals, regional preferences, and medical conditions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-gray-800 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/start')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  Create Diet Plan
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  Login
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/my-plans')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  My Plans
                </button>
              </li>
            </ul>
          </div>

          {/* Company Info */}
          <div>
            <h4 className="font-bold text-gray-800 mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/about')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/terms')}
                  className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center md:text-left">
            © {currentYear} Ghar-Ka-Khana. Made with <Heart size={14} className="inline text-red-500" fill="currentColor" /> in India.
          </p>
          <div className="flex gap-6 text-sm">
            <button onClick={() => navigate('/privacy')} className="text-gray-500 hover:text-green-600 transition-colors duration-300">
              Privacy Policy
            </button>
            <button onClick={() => navigate('/terms')} className="text-gray-500 hover:text-green-600 transition-colors duration-300">
              Terms of Service
            </button>
            <button onClick={() => navigate('/about')} className="text-gray-500 hover:text-green-600 transition-colors duration-300">
              About Us
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

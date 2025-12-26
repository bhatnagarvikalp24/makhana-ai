import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ChefHat, LogIn, User, Home, Plus, List, Settings, DollarSign, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    // Check on mount and location change
    checkUser();

    // Listen for storage changes (including logout)
    window.addEventListener('storage', checkUser);

    // Custom event for same-tab logout
    window.addEventListener('userStateChanged', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userStateChanged', checkUser);
    };
  }, [location]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="bg-gradient-to-br from-green-600 to-green-500 p-2 rounded-xl text-white shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <ChefHat size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight group-hover:text-green-600 transition-colors">
                Ghar-Ka-Khana
              </h1>
              <p className="text-xs text-gray-500 -mt-0.5">AI-Powered Nutrition</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isActive('/')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <Home size={18} />
              Home
            </button>

            <button
              onClick={() => navigate('/start')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isActive('/start')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <Plus size={18} />
              Create
            </button>

            <button
              onClick={() => navigate('/price-optimizer')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isActive('/price-optimizer')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
              title="Smart Price Optimizer"
            >
              <DollarSign size={18} />
              Optimizer
            </button>

            {user ? (
              <>
                <button
                  onClick={() => navigate('/my-plans')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    isActive('/my-plans')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <List size={18} />
                  My Plans
                </button>
                <button
                  onClick={() => navigate('/account-settings')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    isActive('/account-settings')
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  title="Account Settings"
                >
                  <Settings size={18} />
                  Settings
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2.5 rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <LogIn size={18} />
                Login
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            {user ? (
              <button
                onClick={() => navigate('/account-settings')}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-all duration-300"
              >
                <Settings size={18} />
                Settings
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-all duration-300"
              >
                <LogIn size={18} />
                Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4 flex gap-2 overflow-x-auto">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
              isActive('/')
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
            }`}
          >
            <Home size={16} />
            Home
          </button>

          <button
            onClick={() => navigate('/start')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
              isActive('/start')
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
            }`}
          >
            <Plus size={16} />
            Create
          </button>

          <button
            onClick={() => navigate('/price-optimizer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
              isActive('/price-optimizer')
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
            }`}
          >
            <DollarSign size={16} />
            Optimizer
          </button>

          {user && (
            <button
              onClick={() => navigate('/my-plans')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
                isActive('/my-plans')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <List size={16} />
              My Plans
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

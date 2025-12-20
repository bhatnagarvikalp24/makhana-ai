import { useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, LogIn, User, Home, Plus, List } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

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
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isActive('/start')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <Plus size={18} />
              Create Plan
            </button>

            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2.5 rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <List size={18} />
              My Plans
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-all duration-300"
            >
              <User size={18} />
              My Plans
            </button>
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
        </div>
      </div>
    </nav>
  );
}

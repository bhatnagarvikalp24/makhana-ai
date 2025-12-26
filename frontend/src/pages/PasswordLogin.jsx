import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function PasswordLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    name: '',
    security_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      const payload = mode === 'login'
        ? { phone: formData.phone, password: formData.password }
        : { phone: formData.phone, password: formData.password, name: formData.name, security_key: formData.security_key };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      if (response.data.success) {
        // Save auth data
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Dispatch custom event to update navbar
        window.dispatchEvent(new Event('userStateChanged'));

        toast.success(response.data.message);

        // Redirect based on user status
        if (response.data.user.is_new_user || response.data.plans_count === 0) {
          navigate('/start');
        } else {
          navigate('/my-plans');
        }
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Welcome Back! 👋
          </h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Login to your account' : 'Create your account'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile number"
                required
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your 10-digit Indian mobile number
              </p>
            </div>

            {/* Name (only for signup) */}
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                />
              </motion.div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password (min 6 characters)'}
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 6 characters long
                </p>
              )}
            </div>

            {/* Security Key (only for signup) */}
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.security_key}
                  onChange={(e) => setFormData({ ...formData, security_key: e.target.value })}
                  placeholder="Enter a memorable security key"
                  required={mode === 'signup'}
                  minLength={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This key is needed to reset your password if you forget it. Min 4 characters.
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? '🔐 Login' : '🚀 Create Account'
              )}
            </button>
          </form>

          {/* Toggle Mode & Forgot Password */}
          <div className="mt-6 text-center space-y-3">
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors block w-full"
              >
                Forgot Password?
              </button>
            )}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setFormData({ phone: '', password: '', name: '', security_key: '' });
              }}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-xs text-gray-600">Instant Access</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-xs text-gray-600">Secure</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="text-2xl mb-2">💰</div>
            <p className="text-xs text-gray-600">Free Forever</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

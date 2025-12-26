import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing'));
const UserForm = lazy(() => import('./pages/UserForm'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login')); // Legacy login
const OTPLogin = lazy(() => import('./pages/OTPLogin')); // OTP-based login
const PasswordLogin = lazy(() => import('./pages/PasswordLogin')); // NEW: Password login (DEFAULT)
const ForgotPassword = lazy(() => import('./pages/ForgotPassword')); // NEW: Forgot password
const AccountSettings = lazy(() => import('./pages/AccountSettings')); // NEW: Account settings
const Grocery = lazy(() => import('./pages/Grocery'));
const PlanList = lazy(() => import('./pages/PlanList'));
const ProgressHistory = lazy(() => import('./pages/ProgressHistory'));
const PriceOptimizer = lazy(() => import('./pages/PriceOptimizer')); // NEW: Smart Grocery Optimizer
const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const About = lazy(() => import('./pages/About'));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
} 

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            fontWeight: '500',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#16a34a',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />

      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/start" element={<UserForm />} />
              <Route path="/login" element={<PasswordLogin />} /> {/* DEFAULT: Password Login */}
              <Route path="/login-otp" element={<OTPLogin />} /> {/* OTP Login */}
              <Route path="/login-legacy" element={<Login />} /> {/* Legacy login */}
              <Route path="/forgot-password" element={<ForgotPassword />} /> {/* NEW: Forgot Password */}
              <Route path="/account-settings" element={<AccountSettings />} /> {/* NEW: Account Settings */}
              <Route path="/my-plans" element={<PlanList />} />
              <Route path="/plan" element={<Dashboard />} />
              <Route path="/grocery" element={<Grocery />} />
              <Route path="/price-optimizer" element={<PriceOptimizer />} /> {/* NEW: Price Optimizer */}
              <Route path="/progress" element={<ProgressHistory />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
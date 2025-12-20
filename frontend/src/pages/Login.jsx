import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, ArrowRight, Phone, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast'; // <--- Using Toasts for errors

// Use local or production backend based on environment
const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Checking for plans...");

    try {
        // --- FIX 1: ADDED "/login" ENDPOINT ---
        const res = await axios.post(`${API_URL}/login`, { phone });
        
        toast.dismiss(loadingToast);
        toast.success(`Welcome back, ${res.data.user.name}!`);

        // CHECK: Do we have saved plans?
        if (res.data.plans && res.data.plans.length > 0) {
            // YES: Go to the "My Plans" list page
            navigate('/my-plans', { 
                state: { 
                    plans: res.data.plans, 
                    user: res.data.user 
                } 
            });
        } else {
            // NO: User exists but has no plans.
            toast(`No plans found. Let's create one!`, { icon: '🥗' });
            navigate('/start');
        }

    } catch (err) {
        console.error(err);
        toast.dismiss(loadingToast);
        
        if (err.response && err.response.status === 404) {
            toast.error("Account not found. Please create a plan first!");
        } else {
            toast.error("Login failed. Is the backend running?");
        }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        
        {/* Back Button */}
        <button 
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 text-gray-400 hover:text-green-600 transition"
        >
            <ArrowLeft size={20} />
        </button>

        <div className="text-center mb-8 pt-4">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="text-green-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
            <p className="text-gray-500">Enter your phone number to access your saved plans.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center disabled:opacity-50 shadow-lg"
            >
                {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                        Access My Plans <ArrowRight size={18} className="ml-2" />
                    </>
                )}
            </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account? 
            <button onClick={() => navigate('/start')} className="text-green-600 font-bold ml-1 hover:underline">
                Create a Plan
            </button>
        </div>

      </div>
    </div>
  );
}
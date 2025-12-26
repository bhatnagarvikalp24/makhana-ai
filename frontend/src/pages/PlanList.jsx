import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, Utensils, User, Sparkles, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function PlanList() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [checkInCounts, setCheckInCounts] = useState({});
  const [plans, setPlans] = useState(state?.plans || null);
  const [user, setUser] = useState(state?.user || null);
  const [loading, setLoading] = useState(!state?.plans);

  // Fetch plans from API if not provided via state
  useEffect(() => {
    const fetchPlans = async () => {
      // If we already have plans from navigation state, skip API call
      if (state?.plans && state?.user) {
        setPlans(state.plans);
        setUser(state.user);
        setLoading(false);
        return;
      }

      // Check if user is logged in
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      if (!token || !storedUser) {
        toast.error('Please login to view your plans');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/auth/my-plans`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setPlans(response.data.plans);
          setUser(response.data.user);
        } else {
          toast.error('Failed to fetch plans');
          navigate('/start');
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          toast.error('Failed to load plans. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [state, navigate]);

  // Fetch check-in count for each plan
  useEffect(() => {
    const fetchCheckInCounts = async () => {
      if (!plans) return;

      const counts = {};
      for (const plan of plans) {
        try {
          const response = await axios.get(`${API_URL}/progress-history/${plan.id}`);
          if (response.data.success) {
            counts[plan.id] = response.data.checkins?.length || 0;
          }
        } catch (error) {
          console.error(`Failed to fetch check-ins for plan ${plan.id}:`, error);
          counts[plan.id] = 0;
        }
      }
      setCheckInCounts(counts);
    };

    fetchCheckInCounts();
  }, [plans]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-green-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 font-medium">Loading your plans...</p>
        </div>
      </div>
    );
  }

  // No plans state
  if (!plans || plans.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Utensils className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Plans Yet</h2>
            <p className="text-gray-600 mb-8">Start your health journey by creating your first personalized diet plan!</p>
            <button
              onClick={() => navigate('/start')}
              className="bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all duration-300"
            >
              Create Your First Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const openPlan = (plan) => {
    navigate('/plan', {
        state: {
            plan: plan.diet,
            planId: plan.id,
            userId: user.id
        }
    });
  };

  // Extract goal from first plan if available
  const getGoalIcon = (planData) => {
    try {
      const goal = planData?.summary?.toLowerCase() || '';
      if (goal.includes('weight loss') || goal.includes('lose weight')) return '🔥';
      if (goal.includes('muscle') || goal.includes('gain')) return '💪';
      if (goal.includes('balanced') || goal.includes('maintenance')) return '⚖️';
      return '🎯';
    } catch {
      return '🎯';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => navigate('/')} className="mr-4 text-gray-400 hover:text-green-600 transition">
                <ArrowLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Diet Plans</h1>
              <p className="text-gray-600 text-sm mt-1">Welcome back, {user?.name || 'User'}!</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <User className="text-green-600" size={20} />
            <span className="text-sm font-medium text-gray-700">{user?.phone?.replace(/(\d{4})(\d{6})/, '$1-***-***')}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm font-medium">Total Plans</span>
              <Sparkles size={20} />
            </div>
            <div className="text-4xl font-bold">{plans.length}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm font-medium">Latest Plan</span>
              <Calendar size={20} />
            </div>
            <div className="text-lg font-bold">{new Date(plans[0]?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100 text-sm font-medium">Active Goal</span>
              <TrendingUp size={20} />
            </div>
            <div className="text-lg font-bold flex items-center gap-2">
              <span>{getGoalIcon(plans[0]?.diet)}</span>
              <span>In Progress</span>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div className="space-y-4 mb-8">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              onClick={() => openPlan(plan)}
              className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-md hover:shadow-xl hover:border-green-300 cursor-pointer transition-all duration-300 group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{getGoalIcon(plan.diet)}</span>
                    <div>
                      <h3 className="font-bold text-xl text-gray-800 group-hover:text-green-700 transition">
                          {plan.title || "Untitled Plan"}
                      </h3>
                      {index === 0 && (
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full mt-1">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} className="text-gray-400"/>
                      <span>Created {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Utensils size={16} className="text-gray-400"/>
                      <span>7-Day Meal Plan</span>
                    </div>
                  </div>

                  {plan.diet?.daily_targets && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <span className="text-xs text-blue-600 font-medium">
                          {plan.diet.daily_targets.calories}
                        </span>
                      </div>
                      <div className="bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                        <span className="text-xs text-purple-600 font-medium">
                          {plan.diet.daily_targets.protein}
                        </span>
                      </div>
                      {checkInCounts[plan.id] > 0 && (
                        <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 flex items-center gap-1.5">
                          <Activity size={14} className="text-green-600" />
                          <span className="text-xs text-green-600 font-medium">
                            {checkInCounts[plan.id]} Check-in{checkInCounts[plan.id] > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View Progress Button - Only show if check-ins exist */}
                  {checkInCounts[plan.id] > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        navigate('/progress', { state: { planId: plan.id, planTitle: plan.title } });
                      }}
                      className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:shadow-lg transition-all flex items-center gap-1.5"
                    >
                      <Activity size={14} />
                      View Progress History
                    </button>
                  )}
                </div>

                <div className="text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all duration-300">
                    <ChevronRight size={28} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create New Plan Button */}
        <button
          onClick={() => navigate('/start')}
          className="w-full py-5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Sparkles size={20} />
          Create New Plan
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingDown, TrendingUp, Calendar, Activity, Zap, Heart, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function ProgressHistory() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!state?.planId) {
        toast.error('No plan selected');
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/progress-history/${state.planId}`);
        if (response.data.success) {
          setProgressData(response.data);
        } else {
          toast.error('Failed to load progress data');
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
        toast.error('Failed to load progress history');
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [state?.planId, navigate]);

  if (!state?.planId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No plan selected</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Go to My Plans
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading progress history...</p>
        </div>
      </div>
    );
  }

  if (!progressData || progressData.checkins.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/my-plans')}
            className="flex items-center text-gray-600 hover:text-blue-600 transition mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to My Plans
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="text-blue-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Check-Ins Yet</h2>
            <p className="text-gray-600 mb-8">
              Start tracking your progress by submitting your first weekly check-in!
            </p>
            <button
              onClick={() => navigate('/my-plans')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition"
            >
              Go to My Diet Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestCheckIn = progressData.checkins[progressData.checkins.length - 1];
  const firstCheckIn = progressData.checkins[0];
  const totalWeightChange = latestCheckIn.weight_kg - firstCheckIn.weight_kg;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/my-plans')}
              className="mr-4 text-gray-400 hover:text-blue-600 transition"
            >
              <ArrowLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Progress History</h1>
              <p className="text-gray-600 text-sm mt-1">{state.planTitle || 'Your Diet Plan'}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm font-medium">Total Check-Ins</span>
              <Activity size={20} />
            </div>
            <div className="text-4xl font-bold">{progressData.checkins.length}</div>
            <div className="text-xs text-blue-100 mt-1">
              Week {latestCheckIn.week_number} active
            </div>
          </div>

          <div className={`bg-gradient-to-br ${totalWeightChange < 0 ? 'from-green-500 to-green-600' : totalWeightChange > 0 ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600'} text-white p-6 rounded-2xl shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">Total Change</span>
              {totalWeightChange < 0 ? <TrendingDown size={20} /> : totalWeightChange > 0 ? <TrendingUp size={20} /> : <Activity size={20} />}
            </div>
            <div className="text-4xl font-bold">{totalWeightChange > 0 ? '+' : ''}{totalWeightChange.toFixed(1)} kg</div>
            <div className="text-xs text-white/80 mt-1">
              {firstCheckIn.weight_kg}kg → {latestCheckIn.weight_kg}kg
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100 text-sm font-medium">Avg Adherence</span>
              <Heart size={20} />
            </div>
            <div className="text-4xl font-bold">
              {Math.round(progressData.checkins.reduce((sum, c) => sum + c.diet_adherence, 0) / progressData.checkins.length)}%
            </div>
            <div className="text-xs text-purple-100 mt-1">Diet compliance</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-100 text-sm font-medium">Adjustments</span>
              <Zap size={20} />
            </div>
            <div className="text-4xl font-bold">{progressData.calorie_adjustments.length}</div>
            <div className="text-xs text-orange-100 mt-1">Calorie changes</div>
          </div>
        </div>

        {/* Check-Ins Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Calendar className="mr-2 text-blue-600" size={24} />
            Weekly Check-Ins
          </h2>

          <div className="space-y-4">
            {progressData.checkins.slice().reverse().map((checkin, index) => (
              <div
                key={checkin.week_number}
                className="border-l-4 border-blue-500 pl-6 pb-6 relative"
              >
                {/* Timeline dot */}
                <div className="absolute left-[-8px] top-0 w-4 h-4 bg-blue-500 rounded-full"></div>

                <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">Week {checkin.week_number}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(checkin.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${
                      checkin.weight_change_kg < 0
                        ? 'bg-green-100 text-green-700'
                        : checkin.weight_change_kg > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {checkin.weight_change_kg < 0 ? <TrendingDown size={18} /> : checkin.weight_change_kg > 0 ? <TrendingUp size={18} /> : null}
                      {checkin.weight_change_kg > 0 ? '+' : ''}{checkin.weight_change_kg.toFixed(2)} kg
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Weight</p>
                      <p className="text-lg font-bold text-gray-800">{checkin.weight_kg} kg</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Diet Adherence</p>
                      <p className="text-lg font-bold text-blue-600">{checkin.diet_adherence}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Exercise</p>
                      <p className="text-lg font-bold text-purple-600">{checkin.exercise_adherence}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Energy</p>
                      <p className="text-sm font-bold text-gray-700 capitalize">{checkin.energy_level || 'N/A'}</p>
                    </div>
                  </div>

                  {/* AI Insights */}
                  {checkin.insights && checkin.insights.progress_assessment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                      <h4 className="font-bold text-blue-900 text-sm mb-2">AI Assessment</h4>
                      <p className="text-sm text-gray-700">{checkin.insights.progress_assessment}</p>
                    </div>
                  )}

                  {/* Plateau Warning */}
                  {checkin.insights?.plateau_detected && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2 mb-3">
                      <AlertTriangle className="text-orange-600" size={18} />
                      <p className="text-sm text-orange-700 font-medium">Plateau detected this week</p>
                    </div>
                  )}

                  {/* Calorie Adjustment */}
                  {checkin.adjusted_calories && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700 font-medium">
                        ⚙️ Calories adjusted to {checkin.adjusted_calories} kcal/day
                      </p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {checkin.insights?.recommendations && checkin.insights.recommendations.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-bold text-gray-700 text-xs mb-2">Recommendations:</h4>
                      <ul className="space-y-1">
                        {checkin.insights.recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start">
                            <span className="text-green-600 mr-1">✓</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calorie Adjustments Log */}
        {progressData.calorie_adjustments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Zap className="mr-2 text-orange-600" size={24} />
              Calorie Adjustments History
            </h2>

            <div className="space-y-3">
              {progressData.calorie_adjustments.map((adjustment, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">
                      {new Date(adjustment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <span className={`text-sm font-bold ${
                      adjustment.adjustment_amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {adjustment.adjustment_amount > 0 ? '+' : ''}{adjustment.adjustment_amount} kcal
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <span className="font-medium">{adjustment.previous_calories} kcal</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-bold text-blue-600">{adjustment.new_calories} kcal</span>
                  </div>
                  <p className="text-xs text-gray-600 italic">{adjustment.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

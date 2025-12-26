import { useState } from 'react';
import { X, TrendingDown, TrendingUp, Activity, Heart, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function WeeklyCheckIn({ planId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    current_weight_kg: '',
    diet_adherence_percent: 70,
    exercise_adherence_percent: 50,
    energy_level: 'moderate',
    hunger_level: 'moderate',
    challenges: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('WeeklyCheckIn - planId:', planId); // DEBUG

    if (!planId) {
      toast.error('Plan ID not found. Please save your plan first.');
      return;
    }

    if (!formData.current_weight_kg || formData.current_weight_kg <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Analyzing your progress...');

    const requestData = {
      plan_id: planId,
      current_weight_kg: parseFloat(formData.current_weight_kg),
      diet_adherence_percent: parseInt(formData.diet_adherence_percent),
      exercise_adherence_percent: parseInt(formData.exercise_adherence_percent),
      energy_level: formData.energy_level,
      hunger_level: formData.hunger_level,
      challenges: formData.challenges.trim() || null,
      notes: formData.notes.trim() || null
    };

    console.log('WeeklyCheckIn - Request data:', requestData); // DEBUG

    try {
      const response = await axios.post(`${API_URL}/weekly-checkin`, requestData);

      toast.dismiss(loadingToast);

      if (response.data.success) {
        setResults(response.data);
        setShowResults(true);
        toast.success('Check-in complete! Here are your insights.');
        if (onSuccess) onSuccess(response.data);
      } else {
        toast.error(response.data.error || 'Check-in failed');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to submit check-in. Please try again.');
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showResults && results) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative my-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Week {results.week_number} Check-In Complete!</h3>
            <p className="text-gray-500 text-sm mt-1">Here's your AI-powered progress analysis</p>
          </div>

          {/* Weight Change */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week's Progress</p>
                <p className="text-3xl font-bold text-gray-800 flex items-center mt-1">
                  {results.weight_change_kg > 0 ? (
                    <>
                      <TrendingUp className="text-red-500 mr-2" size={28} />
                      +{results.weight_change_kg.toFixed(2)} kg (gained)
                    </>
                  ) : results.weight_change_kg < 0 ? (
                    <>
                      <TrendingDown className="text-green-600 mr-2" size={28} />
                      {results.weight_change_kg.toFixed(2)} kg (lost)
                    </>
                  ) : (
                    <>
                      <div className="text-gray-500 mr-2">➖</div>
                      {results.weight_change_kg.toFixed(2)} kg (no change)
                    </>
                  )}
                </p>
              </div>
              {results.insights.is_on_track ? (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm">
                  On Track ✅
                </div>
              ) : (
                <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-bold text-sm">
                  Needs Attention ⚠️
                </div>
              )}
            </div>
          </div>

          {/* AI Assessment */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-purple-900 mb-2 flex items-center">
              <Activity size={18} className="mr-2" /> AI Progress Assessment
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              {results.insights.progress_assessment}
            </p>
          </div>

          {/* Plateau Warning */}
          {results.insights.plateau_detected && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-orange-900 mb-2">⚠️ Plateau Detected</h4>
              <p className="text-sm text-orange-700">
                Your progress has slowed down. Don't worry - this is normal! Check the recommendations below to break through.
              </p>
            </div>
          )}

          {/* Calorie Adjustment */}
          {results.adjusted_calories && results.previous_calories && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-blue-900 mb-2">📊 Calorie Adjustment</h4>
              <p className="text-sm text-blue-700 mb-3">
                Based on your progress, we've adjusted your daily calorie target:
              </p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Previous</p>
                  <p className="text-lg font-bold text-gray-700">{results.previous_calories} kcal</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">New Target</p>
                  <p className="text-lg font-bold text-blue-700">{results.adjusted_calories} kcal</p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center">
              <Zap size={18} className="mr-2 text-yellow-500" /> Recommendations for Next Week
            </h4>
            <div className="space-y-2">
              {results.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start bg-gray-50 rounded-lg p-3">
                  <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs mr-3 flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Motivation Message */}
          {results.insights.motivation_message && (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4 mb-6">
              <p className="text-center text-gray-700 font-medium flex items-center justify-center">
                <Heart className="text-pink-500 mr-2" size={20} />
                {results.insights.motivation_message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
            >
              Got it! Let's keep going
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity className="text-blue-600" size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Weekly Check-In</h3>
          <p className="text-gray-500 text-sm mt-1">Track your progress and get AI-powered insights</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Weight */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Current Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.current_weight_kg}
              onChange={(e) => setFormData({ ...formData, current_weight_kg: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., 75.5"
              required
            />
          </div>

          {/* Diet Adherence */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Diet Adherence: {formData.diet_adherence_percent}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.diet_adherence_percent}
              onChange={(e) => setFormData({ ...formData, diet_adherence_percent: e.target.value })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <p className="text-xs text-gray-500 mt-1">How well did you follow your meal plan this week?</p>
          </div>

          {/* Exercise Adherence */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Exercise Adherence: {formData.exercise_adherence_percent}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.exercise_adherence_percent}
              onChange={(e) => setFormData({ ...formData, exercise_adherence_percent: e.target.value })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">How consistent were you with physical activity?</p>
          </div>

          {/* Energy Level */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Energy Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'moderate', 'high'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, energy_level: level })}
                  className={`py-2 px-4 rounded-lg border-2 font-medium text-sm transition ${
                    formData.energy_level === level
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Hunger Level */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Hunger Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'moderate', 'high'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, hunger_level: level })}
                  className={`py-2 px-4 rounded-lg border-2 font-medium text-sm transition ${
                    formData.hunger_level === level
                      ? 'border-orange-600 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Challenges */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Challenges (Optional)</label>
            <textarea
              value={formData.challenges}
              onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows="3"
              placeholder="What made it difficult to stick to your plan this week?"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows="2"
              placeholder="Any other observations or questions?"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Analyzing...
                </>
              ) : (
                'Submit Check-In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

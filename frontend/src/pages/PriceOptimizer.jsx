import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function PriceOptimizer() {
  const [groceryInput, setGroceryInput] = useState('');
  const [groceryList, setGroceryList] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [budgetMode, setBudgetMode] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAddItem = () => {
    const items = groceryInput.split(',').map(item => item.trim()).filter(item => item);
    if (items.length > 0) {
      setGroceryList(prev => [...new Set([...prev, ...items])]);
      setGroceryInput('');
    }
  };

  const handleRemoveItem = (index) => {
    setGroceryList(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptimize = async () => {
    if (groceryList.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    setLoading(true);
    setShowResults(false);

    try {
      const response = await axios.post(`${API_URL}/optimize-grocery`, {
        grocery_list: groceryList,
        user_goal: 'budget',
        budget_mode: budgetMode
      });

      setAnalysis(response.data.analysis);
      setShowResults(true);
      toast.success('Optimization complete! 💰');
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize grocery list');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoOptimize = async () => {
    if (groceryList.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auto-optimize-grocery`, {
        grocery_list: groceryList,
        budget_mode: true
      });

      // Update grocery list with optimized version
      setGroceryList(response.data.optimized_list);

      // Show swaps made
      const swapsMessage = response.data.swaps_made.map(swap =>
        `${swap.original} → ${swap.replacement} (₹${swap.savings} saved)`
      ).join('\n');

      toast.success(
        `Saved ₹${response.data.total_savings}!\n\n${swapsMessage}`,
        { duration: 6000 }
      );
    } catch (error) {
      console.error('Auto-optimize error:', error);
      toast.error('Failed to auto-optimize');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            💰 Smart Grocery Optimizer
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered tool to find cheaper alternatives without compromising nutrition
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📝 Your Grocery List
            </h2>

            {/* Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Ingredients (comma-separated)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groceryInput}
                  onChange={(e) => setGroceryInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="e.g., paneer, chicken breast, quinoa"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={handleAddItem}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Grocery List */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Items ({groceryList.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {groceryList.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg"
                    >
                      <span className="text-gray-700 capitalize">{item}</span>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Budget Mode Toggle */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={budgetMode}
                  onChange={(e) => setBudgetMode(e.target.checked)}
                  className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
                />
                <div className="ml-3">
                  <span className="font-semibold text-gray-800">Budget Mode</span>
                  <p className="text-sm text-gray-600">
                    Maximize savings with aggressive optimization
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleOptimize}
                disabled={loading || groceryList.length === 0}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Optimizing...
                  </span>
                ) : (
                  '🔍 Analyze & Suggest Swaps'
                )}
              </button>

              <button
                onClick={handleAutoOptimize}
                disabled={loading || groceryList.length === 0}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                ⚡ Auto-Optimize (Instant Swaps)
              </button>
            </div>
          </motion.div>

          {/* Right: Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              💡 Optimization Results
            </h2>

            <AnimatePresence mode="wait">
              {!showResults ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-96 text-gray-400"
                >
                  <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-medium">Add ingredients and optimize to see results</p>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Savings Summary */}
                  {analysis?.max_savings > 0 && (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90">Potential Savings</p>
                          <p className="text-4xl font-bold">₹{analysis.max_savings}</p>
                        </div>
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* AI Recommendations */}
                  {analysis?.ai_analysis?.recommended_swaps && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">
                        🤖 AI Recommended Swaps
                      </h3>
                      <div className="space-y-3">
                        {analysis.ai_analysis.recommended_swaps.map((swap, index) => (
                          <div
                            key={index}
                            className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 capitalize">
                                  {swap.original} → {swap.replacement}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">{swap.reason}</p>
                              </div>
                              <span className="ml-4 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold whitespace-nowrap">
                                ₹{swap.savings}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nutrition Notes */}
                  {analysis?.ai_analysis?.nutrition_notes && (
                    <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">🥗 Nutrition Notes</h4>
                      <p className="text-gray-700 text-sm">{analysis.ai_analysis.nutrition_notes}</p>
                    </div>
                  )}

                  {/* Personalized Advice */}
                  {analysis?.ai_analysis?.personalized_advice && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-2">💡 Personalized Advice</h4>
                      <p className="text-gray-700 text-sm">{analysis.ai_analysis.personalized_advice}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-bold text-gray-800 mb-2">AI Analysis</h3>
            <p className="text-gray-600 text-sm">
              Claude AI analyzes nutrition profiles and suggests optimal swaps
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="font-bold text-gray-800 mb-2">Save Money</h3>
            <p className="text-gray-600 text-sm">
              Find cheaper alternatives without compromising on nutrition quality
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-gray-800 mb-2">Instant Swaps</h3>
            <p className="text-gray-600 text-sm">
              Auto-optimize mode makes swaps automatically for maximum savings
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Heart, TrendingDown, TrendingUp, X, CheckCircle } from 'lucide-react';

export default function HealthAdvisoryModal({
  isOpen,
  onClose,
  bmiInfo,
  targetBMI,
  currentWeight,
  targetWeight,
  currentGoal,
  suggestedGoal,
  message,
  onChangeGoal,
  isTargetWeightError,
  isGenderMedicalError
}) {
  if (!isOpen) return null;

  const getGoalIcon = (goal) => {
    if (goal === 'Weight Loss') return TrendingDown;
    if (goal === 'Weight Gain' || goal === 'Muscle Gain') return TrendingUp;
    return Heart;
  };

  const CurrentGoalIcon = getGoalIcon(currentGoal);
  const SuggestedGoalIcon = suggestedGoal ? getGoalIcon(suggestedGoal) : null;

  const getBMIColor = (bmi) => {
    if (bmi < 18.5) return 'text-yellow-600';
    if (bmi < 25) return 'text-green-600';
    if (bmi < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition"
            >
              <X size={24} />
            </button>

            <div className="flex items-start gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Heart className="text-white" size={28} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Health Advisory
                </h2>
                <p className="text-blue-100 text-sm">
                  We care about your wellbeing
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Target Weight Error Layout */}
            {isTargetWeightError && targetBMI && (
              <div className="space-y-5 mb-5">
                {/* Current vs Target Weight Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Current Weight & BMI */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                    <p className="text-xs font-medium text-blue-600 mb-2">Current</p>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-blue-900">{currentWeight}kg</span>
                      </div>
                      <div className={`flex items-center gap-1 ${getBMIColor(parseFloat(bmiInfo.bmi))}`}>
                        <span className="text-lg font-semibold">BMI {bmiInfo.bmi}</span>
                      </div>
                      <p className="text-xs text-blue-700">{bmiInfo.classification}</p>
                    </div>
                  </div>

                  {/* Target Weight & BMI */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-300 relative">
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle size={12} />
                      Unsafe
                    </div>
                    <p className="text-xs font-medium text-red-600 mb-2">Target</p>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-red-900">{targetWeight}kg</span>
                      </div>
                      <div className={`flex items-center gap-1 ${getBMIColor(parseFloat(targetBMI.bmi))}`}>
                        <span className="text-lg font-semibold">BMI {targetBMI.bmi}</span>
                      </div>
                      <p className="text-xs text-red-700">{targetBMI.classification}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regular BMI Card (for goal suggestion errors) */}
            {!isTargetWeightError && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-5 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Your Current BMI</span>
                  <div className={`flex items-center gap-2 ${getBMIColor(parseFloat(bmiInfo.bmi))}`}>
                    <AlertCircle size={18} />
                    <span className="text-2xl font-bold">{bmiInfo.bmi}</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <p className="text-center text-sm font-semibold text-gray-700">
                    {bmiInfo.classification}
                  </p>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="mb-6">
              <div className="flex items-start gap-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-gray-700 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Goal Comparison */}
            {suggestedGoal && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-600 mb-3">Recommended Change:</p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Current Goal */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 relative">
                    <div className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                      Current
                    </div>
                    <div className="flex flex-col items-center pt-2">
                      <div className="bg-gray-200 p-2 rounded-lg mb-2">
                        <CurrentGoalIcon className="text-gray-600" size={24} />
                      </div>
                      <p className="text-center text-sm font-semibold text-gray-700">
                        {currentGoal}
                      </p>
                    </div>
                  </div>

                  {/* Suggested Goal */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-4 relative shadow-lg">
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle size={12} />
                      Better
                    </div>
                    <div className="flex flex-col items-center pt-2">
                      <div className="bg-green-100 p-2 rounded-lg mb-2">
                        <SuggestedGoalIcon className="text-green-600" size={24} />
                      </div>
                      <p className="text-center text-sm font-semibold text-green-700">
                        {suggestedGoal}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {suggestedGoal && !isTargetWeightError && (
                <button
                  onClick={onChangeGoal}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Switch to {suggestedGoal}
                </button>
              )}
              <button
                onClick={onClose}
                className={`${suggestedGoal && !isTargetWeightError ? 'flex-none px-6' : 'flex-1'} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl`}
              >
                {suggestedGoal && !isTargetWeightError ? 'Keep Current Goal' : 'I Understand'}
              </button>
            </div>

            {/* Footer Note */}
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 text-center leading-relaxed">
                💡 <strong>Important:</strong> For personalized medical advice, please consult a healthcare professional.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

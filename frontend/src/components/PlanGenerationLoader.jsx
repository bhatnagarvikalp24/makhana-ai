import { motion } from 'framer-motion';
import { Sparkles, Brain, Utensils, TrendingUp, Activity } from 'lucide-react';

export default function PlanGenerationLoader({ userName }) {
  const messages = [
    { icon: Brain, text: "Analyzing your health profile..." },
    { icon: TrendingUp, text: "Calculating optimal macros..." },
    { icon: Utensils, text: "Crafting personalized meals..." },
    { icon: Activity, text: "Fine-tuning your nutrition plan..." }
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 z-50 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        {/* Animated Icon */}
        <motion.div
          className="flex justify-center mb-8"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-6 rounded-full">
              <Sparkles className="text-white" size={48} />
            </div>
          </div>
        </motion.div>

        {/* Main Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
            Creating Your Perfect Plan
          </h2>
          <p className="text-gray-600 text-lg">
            {userName ? `Hey ${userName}! ` : ''}AI is personalizing your diet plan...
          </p>
        </motion.div>

        {/* Animated Messages */}
        <div className="space-y-4 mb-8">
          {messages.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.3,
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2
              }}
              className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
            >
              <div className="bg-gradient-to-r from-blue-100 to-green-100 p-2 rounded-lg">
                <item.icon className="text-blue-600" size={20} />
              </div>
              <span className="text-gray-700 font-medium">{item.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-green-600"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 25,
              ease: "linear"
            }}
          />
        </div>

        <motion.p
          className="text-center text-sm text-gray-500 mt-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          This usually takes 20-30 seconds...
        </motion.p>
      </div>
    </div>
  );
}

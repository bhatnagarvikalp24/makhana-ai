import { motion } from 'framer-motion';
import { ShoppingCart, Sparkles, TrendingDown, Calendar, DollarSign, Check } from 'lucide-react';

export default function GroceryLoading() {
  const steps = [
    { icon: ShoppingCart, text: 'Analyzing your meal plan', color: 'from-blue-500 to-purple-500' },
    { icon: Calendar, text: 'Organizing by categories', color: 'from-purple-500 to-pink-500' },
    { icon: DollarSign, text: 'Calculating price estimates', color: 'from-pink-500 to-orange-500' },
    { icon: TrendingDown, text: 'Finding best deals', color: 'from-orange-500 to-red-500' },
    { icon: Sparkles, text: 'Adding smart recommendations', color: 'from-green-500 to-teal-500' },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 z-50 flex items-center justify-center">
      <div className="max-w-2xl w-full px-6">
        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-4"
            >
              <div className="bg-gradient-to-br from-green-400 to-blue-500 p-6 rounded-full">
                <ShoppingCart size={48} className="text-white" />
              </div>
            </motion.div>

            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Creating Your Smart Grocery List
            </h2>
            <p className="text-gray-600">
              Hang tight! We're preparing something special for you...
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4 mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.3
                  }}
                  className={`bg-gradient-to-r ${step.color} p-3 rounded-lg`}
                >
                  <step.icon size={24} className="text-white" />
                </motion.div>

                <div className="flex-1">
                  <p className="font-medium text-gray-800">{step.text}</p>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.2 + 0.5 }}
                >
                  <div className="bg-green-100 text-green-600 rounded-full p-1">
                    <Check size={16} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Fun Facts / Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200"
          >
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                <Sparkles size={20} className="text-purple-600" />
              </div>
              <div>
                <h4 className="font-bold text-purple-900 mb-1">Did you know?</h4>
                <p className="text-sm text-purple-700">
                  Shopping with a list can save you up to 40% on your grocery bill by reducing impulse purchases!
                </p>
              </div>
            </div>
          </motion.div>

          {/* Loading Bar */}
          <div className="mt-8">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"
                animate={{
                  width: ['0%', '100%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 opacity-20"
        >
          <ShoppingCart size={100} className="text-green-500" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -10, 10, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-20 left-20 opacity-20"
        >
          <DollarSign size={80} className="text-purple-500" />
        </motion.div>
      </div>
    </div>
  );
}

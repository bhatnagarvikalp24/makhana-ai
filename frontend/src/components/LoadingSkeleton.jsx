import { Brain, Sparkles, ChefHat } from 'lucide-react';

export function DietPlanSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12 animate-pulse">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Brain className="text-green-600 animate-pulse" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-3">AI is Crafting Your Plan</h2>
        <p className="text-gray-600 text-lg">Analyzing your profile and creating personalized meals...</p>
      </div>

      {/* Progress Animation */}
      <div className="mb-12 max-w-md mx-auto">
        <div className="flex justify-between mb-2 text-sm text-gray-600">
          <span>Analyzing Profile</span>
          <span className="font-semibold text-green-600">Processing...</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full animate-progress"></div>
        </div>
      </div>

      {/* Skeleton Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Fun Facts */}
      <div className="mt-12 max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border border-green-100">
          <div className="flex items-start gap-3">
            <Sparkles className="text-green-600 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-gray-800 mb-2">Did You Know?</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Our AI analyzes over 500+ Indian recipes and nutritional data to create your perfect meal plan. Each plan is unique to your goals!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GrocerySkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-12 animate-pulse">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ChefHat className="text-green-600 animate-pulse" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-3">Preparing Your Grocery List</h2>
        <p className="text-gray-600 text-lg">Consolidating ingredients from your meal plan...</p>
      </div>

      {/* Skeleton List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {[1, 2, 3].map((category) => (
          <div key={category} className="border-b border-gray-100 last:border-0">
            <div className="bg-gray-50 px-6 py-3 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex justify-between items-center animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Add this to your index.css for the progress animation

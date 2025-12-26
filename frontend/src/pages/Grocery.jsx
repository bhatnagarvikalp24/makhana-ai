import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ExternalLink, Rocket, Download, TrendingUp, AlertTriangle, Sparkles, Info, X, Check, Store, Package, Clock, Users, MapPin, ShoppingCart, Percent, DollarSign } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function Grocery() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // State management
  const [selectedItem, setSelectedItem] = useState(null);
  const [showBudgetOptimizer, setShowBudgetOptimizer] = useState(false);
  const [showStoreComparison, setShowStoreComparison] = useState(false);
  const [showBulkBuying, setShowBulkBuying] = useState(false);
  const [showShoppingRoutes, setShowShoppingRoutes] = useState(false);
  const [showGroupBuying, setShowGroupBuying] = useState(false);
  const [showExpiryAlerts, setShowExpiryAlerts] = useState(false);
  const [selectedStore, setSelectedStore] = useState('all'); // 'all', 'blinkit', 'bigbasket', 'local_market'

  // 1. DEBUG: Check what data actually arrived
  console.log("GROCERY DATA RECEIVED:", state?.list);

  // 2. SAFETY: Handle empty state
  if (!state?.list) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-2">No List Found</h2>
        <button onClick={() => navigate('/start')} className="text-green-600 underline">
            Create a New Plan
        </button>
      </div>
    );
  }

  // 3. ROBUSTNESS: Handle different data structures
  const categories = state.list.categories || (Array.isArray(state.list) ? state.list : []);
  const budgetAnalysis = state.list.budget_analysis || null;
  const seasonalSummary = state.list.seasonal_summary || null;
  const shoppingTips = state.list.shopping_tips || [];

  // NEW: Extract advanced features
  const storeComparison = state.list.store_comparison || null;
  const bulkBuyingOpportunities = state.list.bulk_buying_opportunities || [];
  const shoppingRouteStrategies = state.list.shopping_route_strategies || [];
  const groupBuyingSuggestions = state.list.group_buying_suggestions || [];
  const expiryAlerts = state.list.expiry_alerts || [];

  // 4. HANDLER: Open Blinkit Search
  const buyItem = (item) => {
    const itemName = typeof item === 'string' ? item : item.display || item.name;
    window.open(`https://blinkit.com/s/?q=${encodeURIComponent(itemName)}`, '_blank');
  };

  // 5. HANDLER: Download Grocery List as PDF
  const handleDownloadPDF = () => {
    const loadingToast = toast.loading("Generating PDF...");
    const element = document.getElementById('grocery-printable');
    const opt = {
      margin: [10, 10],
      filename: 'Grocery_List_GharKaKhana.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      toast.dismiss(loadingToast);
      toast.success("Grocery list downloaded!");
    });
  };

  // 6. Get budget level color
  const getBudgetColor = (level) => {
    if (!level) return 'green';
    switch(level.toLowerCase()) {
      case 'low': return 'green';
      case 'moderate': return 'blue';
      case 'high': return 'orange';
      default: return 'green';
    }
  };

  // 7. Count seasonal warnings
  const outOfSeasonCount = categories.reduce((count, cat) => {
    return count + (cat.items || []).filter(item =>
      typeof item === 'object' && item.seasonal_status === 'out_of_season'
    ).length;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <button
                onClick={() => navigate(-1)}
                className="mr-4 text-gray-400 hover:text-green-600 transition group"
            >
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <ShoppingBag className="mr-2 text-green-600"/> Smart Grocery List
              </h1>
              <p className="text-sm text-gray-500 mt-1">With price estimates & seasonal insights</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Price Optimizer Button */}
            <button
              onClick={() => navigate('/price-optimizer')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg"
              title="Optimize grocery prices and find cheaper alternatives"
            >
              <DollarSign size={18} className="mr-2"/> Price Optimizer
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <Download size={18} className="mr-2"/> Download PDF
            </button>
          </div>
        </div>

        {/* NEW: SMART FEATURES - Quick Access Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {/* Store Comparison */}
          {storeComparison && (
            <button
              onClick={() => setShowStoreComparison(!showStoreComparison)}
              className={`p-3 rounded-xl border-2 transition-all ${showStoreComparison ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}
            >
              <Store className="mx-auto mb-1 text-blue-600" size={20} />
              <div className="text-xs font-bold text-gray-800">Store Prices</div>
              <div className="text-xs text-green-600">Save ₹{storeComparison.potential_savings}</div>
            </button>
          )}

          {/* Bulk Buying */}
          {bulkBuyingOpportunities.length > 0 && (
            <button
              onClick={() => setShowBulkBuying(!showBulkBuying)}
              className={`p-3 rounded-xl border-2 transition-all ${showBulkBuying ? 'bg-purple-100 border-purple-500' : 'bg-white border-gray-200 hover:border-purple-300'}`}
            >
              <Package className="mx-auto mb-1 text-purple-600" size={20} />
              <div className="text-xs font-bold text-gray-800">Bulk Buy</div>
              <div className="text-xs text-green-600">{bulkBuyingOpportunities.length} offers</div>
            </button>
          )}

          {/* Shopping Routes */}
          {shoppingRouteStrategies.length > 0 && (
            <button
              onClick={() => setShowShoppingRoutes(!showShoppingRoutes)}
              className={`p-3 rounded-xl border-2 transition-all ${showShoppingRoutes ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-200 hover:border-orange-300'}`}
            >
              <MapPin className="mx-auto mb-1 text-orange-600" size={20} />
              <div className="text-xs font-bold text-gray-800">Routes</div>
              <div className="text-xs text-gray-600">{shoppingRouteStrategies.length} options</div>
            </button>
          )}

          {/* Group Buying */}
          {groupBuyingSuggestions.length > 0 && (
            <button
              onClick={() => setShowGroupBuying(!showGroupBuying)}
              className={`p-3 rounded-xl border-2 transition-all ${showGroupBuying ? 'bg-pink-100 border-pink-500' : 'bg-white border-gray-200 hover:border-pink-300'}`}
            >
              <Users className="mx-auto mb-1 text-pink-600" size={20} />
              <div className="text-xs font-bold text-gray-800">Group Buy</div>
              <div className="text-xs text-green-600">With neighbors</div>
            </button>
          )}

          {/* Expiry Alerts */}
          {expiryAlerts.length > 0 && (
            <button
              onClick={() => setShowExpiryAlerts(!showExpiryAlerts)}
              className={`p-3 rounded-xl border-2 transition-all ${showExpiryAlerts ? 'bg-red-100 border-red-500' : 'bg-white border-gray-200 hover:border-red-300'}`}
            >
              <Clock className="mx-auto mb-1 text-red-600" size={20} />
              <div className="text-xs font-bold text-gray-800">Expiry Risk</div>
              <div className="text-xs text-red-600">{expiryAlerts.length} alerts</div>
            </button>
          )}

          {/* Smart Swaps (existing feature integrated) */}
          {budgetAnalysis?.smart_swaps && budgetAnalysis.smart_swaps.length > 0 && (
            <button
              onClick={() => setShowBudgetOptimizer(!showBudgetOptimizer)}
              className={`p-3 rounded-xl border-2 transition-all ${showBudgetOptimizer ? 'bg-green-100 border-green-500' : 'bg-white border-gray-200 hover:border-green-300'}`}
            >
              <Sparkles className="mx-auto mb-1 text-green-600" size={20} />
              <div className="text-xs font-bold text-gray-800">Smart Swaps</div>
              <div className="text-xs text-green-600">Save ₹{budgetAnalysis.savings_potential}</div>
            </button>
          )}
        </div>

        {/* BUDGET SUMMARY CARD */}
        {budgetAnalysis && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-blue-200 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-2">
                  <TrendingUp size={20} />
                  Budget Analysis
                </h3>
                <div className="text-3xl font-bold text-blue-700">
                  ₹{budgetAnalysis.total_estimated}
                  <span className="text-sm font-normal text-blue-600 ml-2">estimated total</span>
                </div>
              </div>

              {budgetAnalysis.savings_potential > 0 && (
                <button
                  onClick={() => setShowBudgetOptimizer(!showBudgetOptimizer)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Save ₹{budgetAnalysis.savings_potential}
                </button>
              )}
            </div>

            {/* Category Breakdown */}
            {budgetAnalysis.breakdown && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {Object.entries(budgetAnalysis.breakdown).map(([category, amount]) => (
                  <div key={category} className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-600 capitalize mb-1">
                      {category.replace('_', ' & ')}
                    </div>
                    <div className="font-bold text-blue-700">₹{amount}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Budget Level Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${getBudgetColor(budgetAnalysis.budget_level)}-100 text-${getBudgetColor(budgetAnalysis.budget_level)}-700 capitalize`}>
                {budgetAnalysis.budget_level || 'Moderate'} Budget
              </span>
              <span className="text-xs text-gray-600">
                • Prices based on local market rates
              </span>
            </div>
          </div>
        )}

        {/* SEASONAL ALERTS */}
        {seasonalSummary && seasonalSummary.out_of_season_count > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 mb-6 border-2 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-orange-900 mb-1">
                  {seasonalSummary.out_of_season_count} items out of season
                </h4>
                <p className="text-sm text-orange-700 mb-2">{seasonalSummary.message}</p>
                {seasonalSummary.warnings && seasonalSummary.warnings.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {seasonalSummary.warnings.map((item, idx) => (
                      <span key={idx} className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SMART SWAPS PANEL (Collapsible) */}
        {showBudgetOptimizer && budgetAnalysis?.smart_swaps && budgetAnalysis.smart_swaps.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-5 mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-green-900 flex items-center gap-2">
                <Sparkles className="text-green-600" size={20} />
                Smart Swaps to Save Money
              </h3>
              <button
                onClick={() => setShowBudgetOptimizer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {budgetAnalysis.smart_swaps.map((swap, idx) => (
                <div key={idx} className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600 line-through">{swap.original}</span>
                        <span className="text-green-600 font-bold">→</span>
                        <span className="text-sm font-bold text-green-700">{swap.alternative}</span>
                      </div>
                      <p className="text-xs text-gray-600">{swap.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">-₹{swap.savings}</div>
                      <div className="text-xs text-gray-500">saved</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center text-sm text-green-700 font-medium">
              Total savings: ₹{budgetAnalysis.savings_potential} • Nutrition maintained ✓
            </div>
          </div>
        )}

        {/* SHOPPING TIPS */}
        {shoppingTips && shoppingTips.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6 border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
              <Info size={18} />
              Shopping Tips
            </h4>
            <div className="space-y-2">
              {shoppingTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-purple-700">
                  <span className="text-purple-500 mt-0.5">💡</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEW FEATURE PANELS */}

        {/* STORE COMPARISON PANEL */}
        {showStoreComparison && storeComparison && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-5 mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <Store className="text-blue-600" size={20} />
                Multi-Store Price Comparison
              </h3>
              <button onClick={() => setShowStoreComparison(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="text-yellow-600" size={18} />
                  <div className="text-sm font-bold text-yellow-900">Blinkit (Fast)</div>
                </div>
                <div className="text-2xl font-bold text-yellow-700">₹{storeComparison.total_blinkit}</div>
                <div className="text-xs text-yellow-600 mt-1">10-min delivery</div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="text-orange-600" size={18} />
                  <div className="text-sm font-bold text-orange-900">BigBasket</div>
                </div>
                <div className="text-2xl font-bold text-orange-700">₹{storeComparison.total_bigbasket}</div>
                <div className="text-xs text-orange-600 mt-1">Next-day delivery</div>
              </div>

              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="text-green-600" size={18} />
                  <div className="text-sm font-bold text-green-900">Local Market ⭐</div>
                </div>
                <div className="text-2xl font-bold text-green-700">₹{storeComparison.total_local_market}</div>
                <div className="text-xs text-green-600 mt-1">Freshest & Cheapest</div>
              </div>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
              <div className="font-bold text-green-900 mb-1">💰 Best Strategy:</div>
              <div className="text-sm text-green-700">{storeComparison.recommendation}</div>
              <div className="text-xs text-green-600 mt-1 font-bold">Total Savings: ₹{storeComparison.potential_savings}</div>
            </div>
          </div>
        )}

        {/* BULK BUYING PANEL */}
        {showBulkBuying && bulkBuyingOpportunities.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-5 mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <Package className="text-purple-600" size={20} />
                Bulk Buying Opportunities
              </h3>
              <button onClick={() => setShowBulkBuying(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {bulkBuyingOpportunities.map((bulk, idx) => (
                <div key={idx} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-purple-900 mb-1">{bulk.item}</div>
                      <p className="text-sm text-gray-600 mb-2">{bulk.recommendation}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-gray-600">Current: ₹{bulk.current_cost}</span>
                        <span className="text-purple-700 font-bold">Bulk: ₹{bulk.bulk_cost}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">Save ₹{bulk.savings}</div>
                      <Percent className="inline text-purple-500 mt-1" size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHOPPING ROUTES PANEL */}
        {showShoppingRoutes && shoppingRouteStrategies.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 p-5 mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-orange-900 flex items-center gap-2">
                <MapPin className="text-orange-600" size={20} />
                Shopping Route Strategies
              </h3>
              <button onClick={() => setShowShoppingRoutes(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {shoppingRouteStrategies.map((strategy, idx) => (
                <div key={idx} className={`rounded-lg p-4 border-2 ${idx === 1 ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-400' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-gray-900">{strategy.strategy}</div>
                      {idx === 1 && <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold">Recommended</span>}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-700">₹{strategy.total_cost}</div>
                      <div className="text-xs text-gray-500">{strategy.time_saved} saved</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Best for: {strategy.best_for}</div>
                  {strategy.steps && (
                    <div className="space-y-1 mt-2">
                      {strategy.steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-orange-500">→</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GROUP BUYING PANEL */}
        {showGroupBuying && groupBuyingSuggestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-pink-200 p-5 mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-pink-900 flex items-center gap-2">
                <Users className="text-pink-600" size={20} />
                Group Buying with Neighbors
              </h3>
              <button onClick={() => setShowGroupBuying(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200 mb-3">
              <div className="text-sm text-pink-700 mb-2">💡 <strong>Tip:</strong> Share these bulk items with your neighbors to unlock wholesale prices!</div>
            </div>

            <div className="space-y-3">
              {groupBuyingSuggestions.map((group, idx) => (
                <div key={idx} className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-pink-900 mb-2">{group.item}</div>
                      <div className="text-sm text-gray-700 mb-2">{group.recommendation}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-500">Total Cost</div>
                          <div className="font-bold text-pink-700">₹{group.total_cost}</div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-500">Split {group.split_ways} Ways</div>
                          <div className="font-bold text-pink-700">₹{group.cost_per_person} each</div>
                        </div>
                        <div className="bg-green-100 rounded p-2">
                          <div className="text-gray-500">You Save</div>
                          <div className="font-bold text-green-700">₹{group.individual_savings}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPIRY ALERTS PANEL */}
        {showExpiryAlerts && expiryAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-5 mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-red-900 flex items-center gap-2">
                <Clock className="text-red-600" size={20} />
                Expiry Risk Alerts
              </h3>
              <button onClick={() => setShowExpiryAlerts(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-red-50 rounded-lg p-3 border border-red-200 mb-3">
              <div className="text-sm text-red-700">⏰ <strong>Smart Timing:</strong> Buy perishables when you need them, not all at once!</div>
            </div>

            <div className="space-y-2">
              {expiryAlerts.map((alert, idx) => (
                <div key={idx} className={`rounded-lg p-3 border ${alert.risk === 'high' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{alert.item}</div>
                      <div className="text-xs text-gray-600 mt-1">Shelf life: {alert.shelf_life}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${alert.risk === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                      {alert.risk.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-2 bg-white rounded p-2">
                    💡 {alert.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GROCERY LIST - Printable Area */}
        <div id="grocery-printable">
          {/* Header for PDF */}
          <div className="mb-6 text-center print:block hidden">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Grocery List</h1>
            <p className="text-gray-600">Ghar-Ka-Khana - AI-Powered Nutrition</p>
            {budgetAnalysis && (
              <p className="text-lg font-bold text-blue-700 mt-2">
                Estimated Total: ₹{budgetAnalysis.total_estimated}
              </p>
            )}
            <hr className="my-4 border-gray-300" />
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 print:shadow-none print:border-gray-300">
            {categories.map((cat, idx) => (
              <div key={idx} className="border-b border-gray-100 last:border-0 print:break-inside-avoid">
                <div className="bg-green-50 px-6 py-3 font-bold text-green-800 flex justify-between items-center print:bg-gray-100">
                  <span>{cat.name || "Groceries"}</span>
                  <span className="text-xs text-green-600 bg-white px-2 py-1 rounded-full border border-green-200 print:bg-transparent print:border-gray-400">
                    {cat.items?.length || 0} items
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {(cat.items || []).map((item, i) => {
                    // Handle both old string format and new object format
                    const isObject = typeof item === 'object';
                    const displayText = isObject ? item.display : item;
                    const itemName = isObject ? item.name : item;
                    const price = isObject ? item.estimated_price : null;
                    const priceRange = isObject ? item.price_range : null;
                    const seasonalStatus = isObject ? item.seasonal_status : null;
                    const seasonalWarning = isObject ? item.seasonal_warning : null;
                    const alternative = isObject ? item.alternative : null;
                    const usedInMeals = isObject ? item.used_in_meals : null;

                    return (
                      <div key={i} className="group hover:bg-gray-50 p-3 rounded-lg transition print:hover:bg-transparent border border-transparent hover:border-green-100">
                        <div className="flex items-start justify-between">
                          {/* Item Info */}
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 print:bg-black flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-700 font-medium">{displayText}</span>

                                {/* Price Badge */}
                                {price && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold print:hidden">
                                    ₹{price}
                                  </span>
                                )}

                                {/* Seasonal Status */}
                                {seasonalStatus === 'out_of_season' && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold print:hidden">
                                    ⚠️ Out of season
                                  </span>
                                )}
                                {seasonalStatus === 'in_season' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold print:hidden">
                                    ✓ In season
                                  </span>
                                )}
                              </div>

                              {/* Price Range (subtle) */}
                              {priceRange && (
                                <div className="text-xs text-gray-500 mt-1 print:hidden">
                                  Market range: {priceRange}
                                </div>
                              )}

                              {/* Seasonal Warning */}
                              {seasonalWarning && (
                                <div className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded border border-orange-200 print:hidden">
                                  {seasonalWarning}
                                </div>
                              )}

                              {/* Alternative Suggestion */}
                              {alternative && (
                                <div className="text-xs text-green-700 mt-2 bg-green-50 px-2 py-1 rounded border border-green-200 print:hidden">
                                  💡 Consider: {alternative}
                                </div>
                              )}

                              {/* Used in Meals - Clickable */}
                              {usedInMeals && usedInMeals.length > 0 && (
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="text-xs text-gray-500 mt-2 hover:text-blue-600 transition print:hidden flex items-center gap-1"
                                >
                                  <Info size={12} />
                                  Used in {usedInMeals.length} meal{usedInMeals.length > 1 ? 's' : ''} • Click for details
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Buy Button */}
                          <button
                            onClick={() => buyItem(item)}
                            className="text-xs text-yellow-700 font-bold border border-yellow-300 bg-yellow-50 px-3 py-1.5 rounded flex items-center opacity-0 group-hover:opacity-100 transition hover:bg-yellow-100 shadow-sm print:hidden flex-shrink-0"
                          >
                            Buy <ExternalLink size={12} className="ml-1"/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer for PDF */}
          <div className="mt-8 text-center text-sm text-gray-500 print:block hidden">
            <p>Generated by Ghar-Ka-Khana | www.gharkakhana.com</p>
            <p className="mt-1">AI-Powered Personalized Nutrition for Indians</p>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-8 flex gap-4">
          {/* NAVIGATE TO COMING SOON PAGE */}
          <button
              onClick={() => navigate('/coming-soon')}
              className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 transition flex justify-center items-center"
          >
              <Rocket size={18} className="mr-2" /> Order All (Ghar-Ka-Store)
          </button>

          {/* DONE BUTTON -> GO TO HOME */}
          <button
            onClick={() => navigate('/')}
            className="px-6 py-4 rounded-xl font-bold text-gray-600 hover:bg-gray-100 border border-gray-200"
          >
              Done
          </button>
        </div>
      </div>

      {/* ITEM DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedItem.display}</h3>
              {selectedItem.estimated_price && (
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  ₹{selectedItem.estimated_price}
                  <span className="text-sm text-gray-500 ml-2 font-normal">{selectedItem.price_range}</span>
                </div>
              )}
            </div>

            {/* Used in Meals */}
            {selectedItem.used_in_meals && selectedItem.used_in_meals.length > 0 && (
              <div className="mb-4">
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Info size={16} />
                  Used in these meals:
                </h4>
                <div className="space-y-2">
                  {selectedItem.used_in_meals.map((meal, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-2 rounded-lg">
                      <Check size={14} className="text-green-600 flex-shrink-0" />
                      <span>{meal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative */}
            {selectedItem.alternative && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <h4 className="font-bold text-green-900 text-sm mb-2">💡 Better Option:</h4>
                <p className="text-sm text-green-700">{selectedItem.alternative}</p>
              </div>
            )}

            {/* Seasonal Warning */}
            {selectedItem.seasonal_warning && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <h4 className="font-bold text-orange-900 text-sm mb-2">⚠️ Seasonal Alert:</h4>
                <p className="text-sm text-orange-700">{selectedItem.seasonal_warning}</p>
              </div>
            )}

            <button
              onClick={() => buyItem(selectedItem)}
              className="w-full bg-yellow-500 text-white py-3 rounded-xl font-bold hover:bg-yellow-600 transition flex items-center justify-center gap-2"
            >
              Buy on Blinkit
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ExternalLink, Rocket } from 'lucide-react';

export default function Grocery() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // 1. DEBUG: Check what data actually arrived
  console.log("GROCERY DATA RECEIVED:", state?.list);

  // 2. SAFETY: Handle empty state
  if (!state?.list) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-2">No List Found</h2>
        {/* Updated: Redirect to Build Page if no data */}
        <button onClick={() => navigate('/start')} className="text-green-600 underline">
            Create a New Plan
        </button>
      </div>
    );
  }

  // 3. ROBUSTNESS: Handle different data structures
  const categories = state.list.categories || (Array.isArray(state.list) ? state.list : []);

  // 4. HANDLER: Open Blinkit Search
  const buyItem = (item) => {
    window.open(`https://blinkit.com/s/?q=${encodeURIComponent(item)}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="flex items-center mb-6">
        {/* --- FIX: BACK BUTTON NOW GOES TO BUILD PAGE (/start) --- */}
        <button 
            onClick={() => navigate('/start')} 
            className="mr-4 text-gray-400 hover:text-green-600 transition"
        >
            <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <ShoppingBag className="mr-2 text-green-600"/> Weekly Grocery List
        </h1>
      </div>

      {/* GROCERY LIST */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        {categories.map((cat, idx) => (
          <div key={idx} className="border-b border-gray-100 last:border-0">
            <div className="bg-green-50 px-6 py-3 font-bold text-green-800 flex justify-between items-center">
              <span>{cat.name || "Groceries"}</span>
              <span className="text-xs text-green-600 bg-white px-2 py-1 rounded-full border border-green-200">
                {cat.items?.length || 0} items
              </span>
            </div>
            <div className="p-4 space-y-3">
              {(cat.items || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">{item}</span>
                  </div>
                  
                  {/* BLINKIT BUY BUTTON */}
                  <button 
                    onClick={() => buyItem(item)}
                    className="text-xs text-yellow-700 font-bold border border-yellow-300 bg-yellow-50 px-3 py-1.5 rounded flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-yellow-100 shadow-sm"
                  >
                    Buy on Blinkit <ExternalLink size={12} className="ml-1"/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
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
  );
}
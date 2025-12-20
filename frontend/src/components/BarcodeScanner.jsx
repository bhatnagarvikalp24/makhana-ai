import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Scan, Loader2, AlertCircle, Search } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function BarcodeScanner({ onClose, userDiet, userGoal }) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState(null);
  const [scanner, setScanner] = useState(null);

  // Search states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (scanning && !scanner) {
      // Initialize scanner
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "barcode-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [
            0, // CODE_128
            1, // CODE_39
            2, // EAN_13
            3, // EAN_8
            4, // UPC_A
            5, // UPC_E
          ]
        },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      setScanner(html5QrcodeScanner);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Scanner cleanup error:", err));
      }
    };
  }, [scanning]);

  const onScanSuccess = async (decodedText) => {
    setScanning(false);
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }

    toast.success(`Barcode detected: ${decodedText}`);
    await lookupProduct(decodedText);
  };

  const onScanFailure = (error) => {
    // Ignore scan failures (too noisy)
    // console.warn("Scan error:", error);
  };

  const lookupProduct = async (barcode) => {
    setLoading(true);
    const loadingToast = toast.loading('Looking up product...');

    try {
      const response = await axios.post(`${API_URL}/scan-barcode`, {
        barcode: barcode,
        user_diet_preference: userDiet,
        user_goal: userGoal
      });

      toast.dismiss(loadingToast);

      if (response.data.success) {
        setProductData(response.data);
        toast.success('Product found!');
      } else {
        toast.error(response.data.error || 'Product not found');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to look up product');
      console.error('Barcode lookup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    const barcode = prompt("Enter barcode number manually:");
    if (barcode && barcode.trim()) {
      lookupProduct(barcode.trim());
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Searching products...');

    try {
      const response = await axios.post(`${API_URL}/search-product`, {
        search_query: searchQuery,
        user_diet_preference: userDiet,
        user_goal: userGoal
      });

      toast.dismiss(loadingToast);

      if (response.data.success) {
        setSearchResults(response.data.results);
        toast.success(`Found ${response.data.results.length} products`);
      } else {
        toast.error(response.data.error || 'No products found');
        setSearchResults([]);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to search products');
      console.error('Product search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product) => {
    if (product.barcode) {
      setSearchResults([]);
      setShowSearch(false);
      setSearchQuery('');
      lookupProduct(product.barcode);
    } else {
      toast.error('Product missing barcode information');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Scan className="mr-2 text-blue-600" size={24} />
            Barcode Scanner
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!scanning && !productData && !loading && !showSearch && searchResults.length === 0 && (
            <div className="text-center space-y-4">
              <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <Scan className="text-blue-600" size={40} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Check Product</h3>
              <p className="text-gray-600 text-sm">
                Scan barcode or search by name to check if it fits your diet
              </p>

              <div className="space-y-3 pt-4">
                <button
                  onClick={() => setScanning(true)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center"
                >
                  <Scan size={20} className="mr-2" />
                  Scan Barcode
                </button>

                <button
                  onClick={() => setShowSearch(true)}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center"
                >
                  <Search size={20} className="mr-2" />
                  Search by Name
                </button>

                <button
                  onClick={handleManualEntry}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  Enter Barcode Manually
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800 flex items-start">
                  <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Works with Indian brands: Amul, Britannia, Parle, Nestle, ITC, Haldiram's, and more!</span>
                </p>
              </div>
            </div>
          )}

          {showSearch && searchResults.length === 0 && !loading && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Search Product by Name</h3>
                <p className="text-sm text-gray-600 mt-1">No barcode? Search for the product name</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g., Amul Butter, Parle-G..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Search
                </button>
              </div>

              <button
                onClick={() => setShowSearch(false)}
                className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm font-medium"
              >
                ← Back to scan options
              </button>
            </div>
          )}

          {searchResults.length > 0 && !productData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Search Results</h3>
                <button
                  onClick={() => {
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  New Search
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((product, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectProduct(product)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition text-left"
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-contain bg-white rounded border"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-600">{product.brand} • {product.quantity}</div>
                    </div>
                    <div className="text-blue-600">
                      <Search size={20} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanning && (
            <div>
              <div id="barcode-reader" className="rounded-lg overflow-hidden"></div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setScanning(false);
                    if (scanner) {
                      scanner.clear();
                      setScanner(null);
                    }
                  }}
                  className="bg-red-100 text-red-700 px-6 py-2 rounded-lg font-medium hover:bg-red-200 transition"
                >
                  Cancel Scan
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
              <p className="text-gray-600">Analyzing product...</p>
            </div>
          )}

          {productData && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                {productData.product.image_url && (
                  <img
                    src={productData.product.image_url}
                    alt={productData.product.name}
                    className="w-24 h-24 object-contain mx-auto mb-3 bg-white rounded-lg p-2"
                  />
                )}
                <h3 className="text-xl font-bold text-gray-800 text-center mb-1">
                  {productData.product.name}
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  {productData.product.brand} • {productData.product.quantity}
                </p>
              </div>

              {/* Nutrition Facts */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                  📊 Nutrition (per 100g)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Calories</p>
                    <p className="text-lg font-bold text-gray-800">{productData.nutrition.calories} kcal</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Protein</p>
                    <p className="text-lg font-bold text-gray-800">{productData.nutrition.protein}g</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Carbs</p>
                    <p className="text-lg font-bold text-gray-800">{productData.nutrition.carbs}g</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Sugar</p>
                    <p className="text-lg font-bold text-gray-800">{productData.nutrition.sugar}g</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Fat</p>
                    <p className="text-lg font-bold text-gray-800">{productData.nutrition.fat}g</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Fiber</p>
                    <p className="text-lg font-bold text-gray-800">{productData.nutrition.fiber}g</p>
                  </div>
                </div>
              </div>

              {/* Diet Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">🥗 Diet Information</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    {productData.diet_info.is_vegetarian ? '✅' : '❌'} Vegetarian
                  </p>
                  <p>
                    {productData.diet_info.is_vegan ? '✅' : '❌'} Vegan
                  </p>
                  {productData.diet_info.allergens !== "none listed" && (
                    <p className="text-red-700 font-medium">
                      ⚠️ Allergens: {productData.diet_info.allergens}
                    </p>
                  )}
                </div>
              </div>

              {/* AI Analysis */}
              {productData.ai_analysis.compatibility && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-2">🤖 AI Analysis</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {productData.ai_analysis.compatibility}
                  </p>
                </div>
              )}

              {/* Alternatives */}
              {productData.ai_analysis.alternatives && productData.ai_analysis.alternatives.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">💡 Healthier Alternatives</h4>
                  <div className="space-y-2">
                    {productData.ai_analysis.alternatives.map((alt, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-bold text-green-700">{idx + 1}.</span> {alt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setProductData(null);
                    setScanning(false);
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  Scan Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

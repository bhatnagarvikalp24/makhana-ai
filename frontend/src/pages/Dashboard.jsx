import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Loader2, Save, X, Stethoscope, Download, ShieldCheck, RefreshCw, Play, TrendingUp, ScanBarcode } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast'; // <--- 1. IMPORT TOAST
import { generateGrocery } from '../components/api';
import BarcodeScanner from '../components/BarcodeScanner';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function Dashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');

  // Swap Modal States
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapAlternatives, setSwapAlternatives] = useState([]);
  const [currentSwapMeal, setCurrentSwapMeal] = useState({ text: '', type: '', dayIndex: -1, mealKey: '' });

  // Recipe Video Modal States
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  // Barcode Scanner Modal State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // SAFETY CHECKS
  if (!state?.plan) {
    return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold mb-4">No Plan Data Found</h2>
            <button onClick={() => navigate('/start')} className="text-green-600 font-bold underline">Create a Plan</button>
        </div>
    );
  }

  // --- HANDLERS ---
  
  // 1. PDF DOWNLOAD HANDLER
  const handleDownloadPDF = async () => {
    const loadingToast = toast.loading("Generating PDF..."); // Loading toast

    try {
      const element = document.getElementById('printable-area');

      // Clone and prepare element for PDF
      const clone = element.cloneNode(true);

      // Remove print-hidden elements
      const printHidden = clone.querySelectorAll('.print\\:hidden');
      printHidden.forEach(el => el.remove());

      // Show print-only elements
      const printOnly = clone.querySelectorAll('.print\\:block, .hidden.print\\:block');
      printOnly.forEach(el => {
        el.classList.remove('hidden');
        el.style.display = 'block';
      });

      const opt = {
        margin:       [10, 10],
        filename:     `Diet_Plan_${state.plan.summary ? 'Personalized' : '7Day'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1200,
          letterRendering: true,
          backgroundColor: '#ffffff'
        },
        jsPDF:        {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate PDF from cloned element
      await html2pdf().set(opt).from(clone).save();
      toast.dismiss(loadingToast);
      toast.success("PDF Downloaded!");
    } catch (err) {
      console.error('PDF Error:', err);
      toast.dismiss(loadingToast);
      toast.error("PDF generation failed");
    }
  };

  const handleGrocery = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Preparing your grocery list..."); // Loading toast
    try {
        const res = await generateGrocery(state.planId);
        toast.dismiss(loadingToast); // Dismiss loading
        navigate('/grocery', { state: { list: res.data } });
    } catch (error) {
        console.error(error);
        toast.dismiss(loadingToast);
        toast.error("Could not generate grocery list. Check backend console."); // Error toast
    }
    setLoading(false);
  };

  const handleSavePlan = async () => {
    if (phone.length < 10 || !planTitle) {
        toast.error("Please enter a valid phone number and plan name."); // Error toast
        return;
    }
    setSaveStatus('saving');
    const savingToast = toast.loading("Saving your plan...");

    try {
        await axios.post(`${API_URL}/save-plan`, {
            user_id: state.userId || state.plan?.user_id,
            phone: phone,
            title: planTitle
        });
        setSaveStatus('success');
        toast.dismiss(savingToast);
        toast.success("Plan Saved Permanently! 💾"); // Success toast

        setTimeout(() => setShowSaveModal(false), 2000);
    } catch (error) {
        console.error(error);
        setSaveStatus('error');
        toast.dismiss(savingToast);
        toast.error("Could not save plan. Is the backend running?"); // Error toast
    }
  };

  // SWAP MEAL HANDLER
  const handleSwapMeal = async (mealText, mealType, dayIndex, mealKey) => {
    setCurrentSwapMeal({ text: mealText, type: mealType, dayIndex, mealKey });
    setShowSwapModal(true);
    setSwapLoading(true);
    setSwapAlternatives([]);

    try {
      const userProfile = state.profile || {
        diet_pref: 'vegetarian',
        region: 'North Indian',
        goal: 'balanced diet',
        age: 30,
        gender: 'male',
        medical_manual: 'None'
      };

      const response = await axios.post(`${API_URL}/swap-meal`, {
        meal_text: mealText,
        meal_type: mealType,
        user_profile: userProfile
      });

      setSwapAlternatives(response.data.alternatives || []);
    } catch (error) {
      console.error('Swap error:', error);
      toast.error("Could not generate alternatives. Please try again.");
      setShowSwapModal(false);
    } finally {
      setSwapLoading(false);
    }
  };

  // Apply swap to plan
  const applySwap = (alternativeDescription) => {
    toast.success("Meal swapped! Note: This is a preview. Save your plan to keep changes.");

    // Update the meal in the state (note: this is client-side only for now)
    const updatedDays = [...state.plan.days];
    updatedDays[currentSwapMeal.dayIndex][currentSwapMeal.mealKey] = alternativeDescription;

    // Close modal
    setShowSwapModal(false);

    // Note: To persist this, we'd need to update the backend plan
    // For MVP, we're just showing the swap capability
  };

  // RECIPE VIDEO HANDLER
  const handleWatchRecipe = async (mealText) => {
    setShowVideoModal(true);
    setVideoLoading(true);
    setCurrentVideo(null);

    try {
      const response = await axios.post(`${API_URL}/get-recipe-video`, {
        meal_name: mealText,
        language: "any"
      });

      setCurrentVideo(response.data);
    } catch (error) {
      console.error('Recipe video error:', error);
      toast.error("Could not load recipe video. Please try again.");
      setShowVideoModal(false);
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-6 relative">

        {/* --- HEADER --- */}
        <div className="mb-6">
          <button onClick={() => navigate('/start')} className="flex items-center text-gray-500 hover:text-green-600 mb-4 transition-all duration-300 group">
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform"/> Back
          </button>

          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your 7-Day Diet Plan</h1>
              <p className="text-gray-500 mt-1 text-sm md:text-base">Personalized for your goals</p>
            </div>

            {/* Mobile-Optimized Button Layout */}
            <div className="space-y-2">
              {/* Primary Action - Grocery List (Full Width on Mobile) */}
              <button
                  onClick={handleGrocery}
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 text-base font-semibold disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <ShoppingCart size={18}/>}
                  Grocery List
              </button>

              {/* Secondary Actions - Grid Layout on Mobile */}
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-2">
                <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition flex flex-col items-center justify-center gap-1 text-xs md:text-sm font-medium shadow-sm"
                >
                    <Download size={18} className="md:w-4 md:h-4"/>
                    <span className="hidden md:inline">PDF</span>
                </button>

                <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition flex flex-col items-center justify-center gap-1 text-xs md:text-sm font-medium shadow-sm"
                >
                    <Save size={18} className="md:w-4 md:h-4"/>
                    <span className="hidden md:inline">Save</span>
                </button>

                <button
                    onClick={() => setShowBarcodeScanner(true)}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition flex flex-col items-center justify-center gap-1 text-xs md:text-sm font-medium shadow-sm"
                >
                    <ScanBarcode size={18} className="md:w-4 md:h-4"/>
                    <span className="hidden md:inline">Scan</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- PRINTABLE AREA START --- */}
        <div id="printable-area">

          {/* PDF Header - Only visible in print */}
          <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Personalized Diet Plan</h1>
            <p className="text-lg text-gray-600">Powered by Ghar-Ka-Khana AI</p>
            <p className="text-sm text-gray-500 mt-2">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Summary Card */}
          {state.plan.summary && (
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-blue-50 p-6 md:p-8 rounded-2xl border-2 border-green-200 mb-8 shadow-xl print:shadow-none animate-fade-in-delayed">
                <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-md text-green-600 mt-1">
                        <Stethoscope size={28} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-xl text-green-900 mb-2 flex items-center gap-2 flex-wrap">
                          Your Personalized Plan
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">AI Crafted</span>
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-base mb-4">
                            {state.plan.summary}
                        </p>

                        {/* Daily Nutrition Targets */}
                        {state.plan.daily_targets && (
                          <div className="bg-white/80 p-4 rounded-xl border border-green-100 mt-4">
                            <h4 className="font-bold text-sm text-green-800 mb-3">📊 Daily Nutrition Targets</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-green-700">{state.plan.daily_targets.calories}</div>
                                <div className="text-xs text-gray-600">Calories</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-green-700">{state.plan.daily_targets.protein}</div>
                                <div className="text-xs text-gray-600">Protein</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-green-700 text-xs">{state.plan.daily_targets.carbs_guidance}</div>
                                <div className="text-xs text-gray-600">Carbs</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-green-700 text-xs">{state.plan.daily_targets.fats_guidance}</div>
                                <div className="text-xs text-gray-600">Fats</div>
                              </div>
                            </div>
                            {state.plan.daily_targets.medical_adjustments && (
                              <div className="mt-3 pt-3 border-t border-green-100 text-xs text-gray-600">
                                <span className="font-semibold text-green-700">Medical Note:</span> {state.plan.daily_targets.medical_adjustments}
                              </div>
                            )}

                            {/* Contextual Explanations */}
                            {(state.plan.daily_targets.calories_reasoning || state.plan.daily_targets.protein_reasoning) && (
                              <div className="mt-4 space-y-3">
                                {state.plan.daily_targets.calories_reasoning && (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <div className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                                      <TrendingUp size={14} /> Why these calories?
                                    </div>
                                    <div className="text-xs text-blue-700 leading-relaxed">
                                      {state.plan.daily_targets.calories_reasoning}
                                    </div>
                                  </div>
                                )}

                                {state.plan.daily_targets.protein_reasoning && (
                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                    <div className="text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                                      <ShieldCheck size={14} /> Why this protein level?
                                    </div>
                                    <div className="text-xs text-purple-700 leading-relaxed">
                                      {state.plan.daily_targets.protein_reasoning}
                                    </div>
                                  </div>
                                )}

                                {state.plan.daily_targets.adherence_note && (
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="text-xs text-gray-700 italic">
                                      💡 {state.plan.daily_targets.adherence_note}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                </div>
            </div>
          )}

          {/* Meal Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 print:block print:space-y-4 animate-fade-in-delayed-more">
            {state.plan.days.map((day, idx) => (
               <div key={idx} className="bg-white p-6 rounded-2xl border border-green-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 print:break-inside-avoid print:shadow-none print:border-gray-200 print:mb-4 group">
                   <div className="flex justify-between items-center border-b-2 border-green-100 pb-3 mb-4">
                       <h3 className="font-bold text-xl text-green-800 group-hover:text-green-600 transition-colors">Day {day.day || idx + 1}</h3>
                       <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                         {idx + 1}/7
                       </div>
                   </div>
                   <div className="space-y-3 text-sm text-gray-700">
                       {day.early_morning && (
                         <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                           <p className="flex-1"><span className="font-bold text-orange-500">☀️ Early Morning:</span> {day.early_morning}</p>
                           <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                             <button
                               onClick={() => handleWatchRecipe(day.early_morning)}
                               className="text-blue-600 hover:text-blue-700"
                               title="Watch recipe"
                             >
                               <Play size={14} fill="currentColor" />
                             </button>
                             <button
                               onClick={() => handleSwapMeal(day.early_morning, 'early_morning', idx, 'early_morning')}
                               className="text-green-600 hover:text-green-700"
                               title="Find alternatives"
                             >
                               <RefreshCw size={14} />
                             </button>
                           </div>
                         </div>
                       )}

                       <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                         <p className="flex-1"><span className="font-bold text-green-600">🌅 Breakfast:</span> {day.breakfast || day.meals?.breakfast || "Not planned"}</p>
                         <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                           <button
                             onClick={() => handleWatchRecipe(day.breakfast || day.meals?.breakfast)}
                             className="text-blue-600 hover:text-blue-700"
                             title="Watch recipe"
                           >
                             <Play size={14} fill="currentColor" />
                           </button>
                           <button
                             onClick={() => handleSwapMeal(day.breakfast || day.meals?.breakfast, 'breakfast', idx, 'breakfast')}
                             className="text-green-600 hover:text-green-700"
                             title="Find alternatives"
                           >
                             <RefreshCw size={14} />
                           </button>
                         </div>
                       </div>

                       {day.mid_morning && (
                         <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                           <p className="flex-1"><span className="font-bold text-blue-500">🍎 Mid-Morning:</span> {day.mid_morning}</p>
                           <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                             <button
                               onClick={() => handleWatchRecipe(day.mid_morning)}
                               className="text-blue-600 hover:text-blue-700"
                               title="Watch recipe"
                             >
                               <Play size={14} fill="currentColor" />
                             </button>
                             <button
                               onClick={() => handleSwapMeal(day.mid_morning, 'mid_morning', idx, 'mid_morning')}
                               className="text-green-600 hover:text-green-700"
                               title="Find alternatives"
                             >
                               <RefreshCw size={14} />
                             </button>
                           </div>
                         </div>
                       )}

                       <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                         <p className="flex-1"><span className="font-bold text-green-600">🍛 Lunch:</span> {day.lunch || day.meals?.lunch || "Not planned"}</p>
                         <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                           <button
                             onClick={() => handleWatchRecipe(day.lunch || day.meals?.lunch)}
                             className="text-blue-600 hover:text-blue-700"
                             title="Watch recipe"
                           >
                             <Play size={14} fill="currentColor" />
                           </button>
                           <button
                             onClick={() => handleSwapMeal(day.lunch || day.meals?.lunch, 'lunch', idx, 'lunch')}
                             className="text-green-600 hover:text-green-700"
                             title="Find alternatives"
                           >
                             <RefreshCw size={14} />
                           </button>
                         </div>
                       </div>

                       <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                         <p className="flex-1"><span className="font-bold text-amber-600">☕ Evening Snack:</span> {day.evening_snack || day.snack || day.meals?.snack || "Not planned"}</p>
                         <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                           <button
                             onClick={() => handleWatchRecipe(day.evening_snack || day.snack || day.meals?.snack)}
                             className="text-blue-600 hover:text-blue-700"
                             title="Watch recipe"
                           >
                             <Play size={14} fill="currentColor" />
                           </button>
                           <button
                             onClick={() => handleSwapMeal(day.evening_snack || day.snack || day.meals?.snack, 'snack', idx, 'evening_snack')}
                             className="text-green-600 hover:text-green-700"
                             title="Find alternatives"
                           >
                             <RefreshCw size={14} />
                           </button>
                         </div>
                       </div>

                       <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                         <p className="flex-1"><span className="font-bold text-indigo-600">🌙 Dinner:</span> {day.dinner || day.meals?.dinner || "Not planned"}</p>
                         <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                           <button
                             onClick={() => handleWatchRecipe(day.dinner || day.meals?.dinner)}
                             className="text-blue-600 hover:text-blue-700"
                             title="Watch recipe"
                           >
                             <Play size={14} fill="currentColor" />
                           </button>
                           <button
                             onClick={() => handleSwapMeal(day.dinner || day.meals?.dinner, 'dinner', idx, 'dinner')}
                             className="text-green-600 hover:text-green-700"
                             title="Find alternatives"
                           >
                             <RefreshCw size={14} />
                           </button>
                         </div>
                       </div>

                       {day.before_bed && (
                         <div className="leading-relaxed flex justify-between items-start group/meal print:block">
                           <p className="flex-1"><span className="font-bold text-purple-500">🌜 Before Bed:</span> {day.before_bed}</p>
                           <div className="flex gap-2 opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden">
                             <button
                               onClick={() => handleWatchRecipe(day.before_bed)}
                               className="text-blue-600 hover:text-blue-700"
                               title="Watch recipe"
                             >
                               <Play size={14} fill="currentColor" />
                             </button>
                             <button
                               onClick={() => handleSwapMeal(day.before_bed, 'before_bed', idx, 'before_bed')}
                               className="text-green-600 hover:text-green-700"
                               title="Find alternatives"
                             >
                               <RefreshCw size={14} />
                             </button>
                           </div>
                         </div>
                       )}
                   </div>
               </div>
            ))}
          </div>

          {/* Activity Guidance */}
          {state.plan.activity_guidance && (
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 print:break-inside-avoid">
              <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center">
                🏋️ Activity Guidance
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/80 p-3 rounded-lg">
                  <div className="font-semibold text-blue-700 mb-1">Frequency</div>
                  <div className="text-gray-700">{state.plan.activity_guidance.training_frequency}</div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg">
                  <div className="font-semibold text-blue-700 mb-1">Type</div>
                  <div className="text-gray-700">{state.plan.activity_guidance.type}</div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg md:col-span-1">
                  <div className="font-semibold text-blue-700 mb-1">Tips</div>
                  <div className="text-gray-700">{state.plan.activity_guidance.beginner_tips}</div>
                </div>
              </div>
            </div>
          )}

          {/* Expected Results */}
          {state.plan.expected_results && (
            <div className="mt-8 bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200 print:break-inside-avoid">
              <h3 className="font-bold text-lg text-emerald-900 mb-4 flex items-center">
                📈 Expected Results & Milestones
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 bg-white/80 p-3 rounded-lg">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="font-semibold text-emerald-700">Weekly Progress</div>
                    <div className="text-gray-700">{state.plan.expected_results.weekly_weight_change}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/80 p-3 rounded-lg">
                  <span className="text-2xl">👀</span>
                  <div>
                    <div className="font-semibold text-emerald-700">Visible Changes</div>
                    <div className="text-gray-700">{state.plan.expected_results.visible_changes}</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="bg-white/80 p-3 rounded-lg">
                    <div className="font-semibold text-emerald-700 mb-1">30 Days</div>
                    <div className="text-gray-700 text-xs">{state.plan.expected_results["30_day_milestone"]}</div>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <div className="font-semibold text-emerald-700 mb-1">60 Days</div>
                    <div className="text-gray-700 text-xs">{state.plan.expected_results["60_day_milestone"]}</div>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <div className="font-semibold text-emerald-700 mb-1">90 Days</div>
                    <div className="text-gray-700 text-xs">{state.plan.expected_results["90_day_milestone"]}</div>
                  </div>
                </div>
                {state.plan.expected_results.plateau_warning && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">Note:</span> {state.plan.expected_results.plateau_warning}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Important Notes & Safety */}
          {state.plan.important_notes && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200 print:break-inside-avoid">
              <h3 className="font-bold text-lg text-purple-900 mb-4 flex items-center">
                💡 Important Notes & Safety
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white/80 p-3 rounded-lg">
                  <div className="font-semibold text-purple-700 mb-1">💧 Hydration</div>
                  <div className="text-gray-700">{state.plan.important_notes.hydration}</div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg">
                  <div className="font-semibold text-purple-700 mb-1">😴 Sleep</div>
                  <div className="text-gray-700">{state.plan.important_notes.sleep}</div>
                </div>
                {state.plan.important_notes.medical_disclaimer && (
                  <div className="bg-white/80 p-3 rounded-lg md:col-span-2">
                    <div className="font-semibold text-purple-700 mb-1">⚕️ Medical Disclaimer</div>
                    <div className="text-gray-700">{state.plan.important_notes.medical_disclaimer}</div>
                  </div>
                )}
                <div className="bg-white/80 p-3 rounded-lg md:col-span-2">
                  <div className="font-semibold text-purple-700 mb-1">📅 Reassessment</div>
                  <div className="text-gray-700">{state.plan.important_notes.reassessment}</div>
                </div>
              </div>
            </div>
          )}

          {/* --- LEGAL DISCLAIMER (FOOTER) --- */}
          <div className="mt-12 p-4 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 text-center">
              <div className="flex justify-center items-center mb-2 text-gray-400">
                  <ShieldCheck size={16} className="mr-1"/> Medical Disclaimer
              </div>
              <p>
                  This diet plan is generated by AI for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.
                  Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </p>
          </div>
      </div> 
      {/* --- PRINTABLE AREA END --- */}

      {/* --- SAVE PLAN MODAL --- */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
                <button 
                    onClick={() => setShowSaveModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Save className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Save Your Plan</h3>
                    <p className="text-gray-500 text-sm">Save this diet to access it later.</p>
                </div>

                {saveStatus === 'success' ? (
                    <div className="text-center text-green-600 font-bold py-4 bg-green-50 rounded-lg">
                        ✅ Plan Saved Successfully!
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Plan Name (e.g. Muscle Gain Week 1)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            value={planTitle}
                            onChange={(e) => setPlanTitle(e.target.value)}
                        />
                        <input 
                            type="tel" 
                            placeholder="Phone Number"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        <button 
                            onClick={handleSavePlan}
                            disabled={saveStatus === 'saving'}
                            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition flex justify-center"
                        >
                            {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : "Save Permanently"}
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- SWAP MEAL MODAL --- */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative my-8">
            <button
              onClick={() => setShowSwapModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Swap This Meal</h3>
              <p className="text-gray-500 text-sm mt-1">Current: {currentSwapMeal.text}</p>
            </div>

            {swapLoading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin text-green-600 mx-auto mb-3" size={40} />
                <p className="text-gray-600">Finding smart alternatives...</p>
              </div>
            ) : swapAlternatives.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No alternatives found. Please try again.
              </div>
            ) : (
              <div className="space-y-4">
                {swapAlternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-xl p-4 hover:border-green-500 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => applySwap(alt.description)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                        {alt.name}
                      </h4>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                        {alt.diet_tag}
                      </span>
                    </div>

                    <p className="text-gray-700 text-sm mb-3">{alt.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="font-semibold text-blue-700">Macros:</span>
                        <span className="text-gray-700 ml-1">{alt.macro_match}</span>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="font-semibold text-green-700">Why:</span>
                        <span className="text-gray-700 ml-1">{alt.why}</span>
                      </div>
                    </div>

                    <button className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Use This Alternative
                    </button>
                  </div>
                ))}

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <strong>Note:</strong> Swapping meals is currently a preview feature. Changes won't be saved permanently yet.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- RECIPE VIDEO MODAL --- */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 relative my-8">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Play className="text-blue-600" size={24} fill="currentColor" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Recipe Video</h3>
            </div>

            {videoLoading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-3" size={40} />
                <p className="text-gray-600">Loading recipe video...</p>
              </div>
            ) : currentVideo ? (
              <div>
                {currentVideo.fallback ? (
                  // Fallback: Open YouTube search
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <img
                        src="https://www.youtube.com/img/desktop/yt_1200.png"
                        alt="YouTube"
                        className="w-32 mx-auto mb-4 opacity-50"
                      />
                      <p className="text-gray-600 mb-2">No API key configured or video not found.</p>
                      <p className="text-sm text-gray-500">Opening YouTube search instead...</p>
                    </div>
                    <a
                      href={currentVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition"
                    >
                      <Play size={18} className="mr-2" fill="currentColor" />
                      Search on YouTube
                    </a>
                  </div>
                ) : (
                  // Show video embed
                  <div>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                      <iframe
                        width="100%"
                        height="100%"
                        src={currentVideo.embed_url}
                        title={currentVideo.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>

                    <div className="text-left">
                      <h4 className="font-bold text-gray-800 mb-2">{currentVideo.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-semibold">Channel:</span> {currentVideo.channel}
                      </p>

                      <a
                        href={currentVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Watch on YouTube
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No video available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- BARCODE SCANNER MODAL --- */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onClose={() => setShowBarcodeScanner(false)}
          userDiet={state.plan?.diet_preference || 'Not specified'}
          userGoal={state.plan?.goal || 'Not specified'}
        />
      )}

      </div>
    </div>
  );
}
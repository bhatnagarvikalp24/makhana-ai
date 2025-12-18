import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Loader2, Save, X, Stethoscope, Download, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js'; 
import toast from 'react-hot-toast'; // <--- 1. IMPORT TOAST
import { generateGrocery } from '../components/api';

export default function Dashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');

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
  const handleDownloadPDF = () => {
    const loadingToast = toast.loading("Generating PDF..."); // Loading toast
    const element = document.getElementById('printable-area'); 
    const opt = {
      margin:       [10, 10],
      filename:     `Diet_Plan_${state.plan.summary ? 'Personalized' : '7Day'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // Generate PDF
    html2pdf().set(opt).from(element).save().then(() => {
        toast.dismiss(loadingToast);
        toast.success("PDF Downloaded!");
    });
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
        await axios.post('https://makhana-ai.onrender.com/save-plan', {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 relative">

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-fade-in">
          <button onClick={() => navigate('/start')} className="flex items-center text-gray-500 hover:text-green-600 self-start md:self-auto transition-all duration-300 group">
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform"/> New Plan
          </button>

          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500 text-center">Your 7-Day Plan 🥗</h1>

          <div className="flex gap-2 flex-wrap justify-center">
            {/* DOWNLOAD PDF BUTTON */}
            <button
                onClick={handleDownloadPDF}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl font-bold flex items-center hover:bg-green-100 transition-all duration-300 hover:shadow-md"
            >
                <Download size={18} className="mr-2"/> PDF
            </button>

            <button
                onClick={() => setShowSaveModal(true)}
                className="bg-white border-2 border-green-600 text-green-600 px-4 py-2.5 rounded-xl font-bold flex items-center hover:bg-green-50 transition-all duration-300 hover:shadow-md"
            >
                <Save size={18} className="mr-2"/> Save
            </button>

            <button
                onClick={handleGrocery}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center hover:from-green-700 hover:to-green-600 disabled:opacity-50 transition-all duration-300 hover:shadow-lg"
            >
                {loading ? <Loader2 className="animate-spin mr-2"/> : <ShoppingCart size={18} className="mr-2"/>}
                Grocery
            </button>
          </div>
        </div>

        {/* --- PRINTABLE AREA START --- */}
        <div id="printable-area">

          {/* Summary Card */}
          {state.plan.summary && (
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-blue-50 p-6 md:p-8 rounded-2xl border-2 border-green-200 mb-8 shadow-xl print:shadow-none animate-fade-in-delayed">
                <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-md text-green-600 mt-1">
                        <Stethoscope size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-green-900 mb-2 flex items-center gap-2">
                          Chief Nutritionist's Note
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">AI Generated</span>
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-base">
                            "{state.plan.summary}"
                        </p>
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
                       <p className="leading-relaxed"><span className="font-bold text-green-600">🌅 Breakfast:</span> {day.breakfast || day.meals?.breakfast || "Not planned"}</p>
                       <p className="leading-relaxed"><span className="font-bold text-green-600">🍛 Lunch:</span> {day.lunch || day.meals?.lunch || "Not planned"}</p>
                       <p className="leading-relaxed"><span className="font-bold text-green-600">🍪 Snack:</span> {day.snack || day.meals?.snack || "Not planned"}</p>
                       <p className="leading-relaxed"><span className="font-bold text-green-600">🌙 Dinner:</span> {day.dinner || day.meals?.dinner || "Not planned"}</p>
                   </div>
               </div>
            ))}
          </div>

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

      </div>
    </div>
  );
}
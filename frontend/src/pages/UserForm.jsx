import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UploadCloud, FileText, AlertCircle, ArrowLeft, Lock, Target } from 'lucide-react';
import toast from 'react-hot-toast'; // <--- 1. IMPORT TOAST
import { generateDiet, uploadReport } from '../components/api';

export default function UserForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // New state for the manual text entry
  const [customCondition, setCustomCondition] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    height: '',
    weight: '',
    goal: 'Weight Loss', 
    cuisine: 'North Indian',
    type: 'Vegetarian',
    budget: 'Medium',
    medical_manual: [] 
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);
    const loadingToast = toast.loading("Analyzing blood report..."); // <--- Loading Toast

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
        const res = await uploadReport(uploadData);
        toast.dismiss(loadingToast); // Dismiss loading

        if (res.data.issues && res.data.issues.length > 0) {
            setFormData(prev => ({
                ...prev,
                medical_manual: [...prev.medical_manual, ...res.data.issues]
            }));
            toast.success(`Analysis Complete! Found: ${res.data.issues.length} issues`);
        } else {
            toast.success("Report analyzed. No major issues found.");
        }
    } catch (error) {
        console.error(error);
        toast.dismiss(loadingToast);
        toast.error("Could not analyze report. Ensure it's a clear PDF.");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async () => {
    // 1. VALIDATION
    if (!formData.name || !formData.age || !formData.height || !formData.weight) {
        toast.error("Please fill in all details (Name, Age, Height, Weight).");
        return;
    }

    setLoading(true);
    // 2. LOADING TOAST
    const loadingToast = toast.loading("AI is generating your personalized plan...");

    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // LOGIC: If they typed a custom condition, add it to the AI's medical tags
      let finalMedicalTags = [...formData.medical_manual];
      if (formData.goal === 'Manage Medical Condition' && customCondition) {
          finalMedicalTags.push(`Condition: ${customCondition}`);
      }

      const profile = {
        name: formData.name,             
        phone: guestId,                  
        age: parseInt(formData.age),
        gender: formData.gender,
        height_cm: parseFloat(formData.height),
        weight_kg: parseFloat(formData.weight),
        goal: formData.goal,
        diet_pref: formData.type,
        region: formData.cuisine,
        budget: formData.budget,
        cooking_time: "Flexible",
        medical_manual: finalMedicalTags // Send the combined list
      };

      const res = await generateDiet(profile);
      
      // 3. SUCCESS TOAST & DISMISS LOADING
      toast.dismiss(loadingToast);
      toast.success("Plan Generated Successfully! 🎉");

      navigate('/plan', { 
        state: { 
            plan: res.data.diet, 
            planId: res.data.plan_id, 
            userId: res.data.user_id 
        } 
      });
      
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast); // Dismiss loading on error too
      toast.error("Error generating plan. Check backend console.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-2xl mx-auto py-10 px-4">

        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-500 hover:text-green-600 mb-6 transition-all duration-300 hover:translate-x-1 group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform"/> Back to Home
        </button>

        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-4xl font-extrabold mb-3 text-gray-800">Build Your Plan</h2>
          <p className="text-lg text-gray-600">Tell us about your body & taste preferences</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
            <Target size={16} />
            <span>Personalized just for you</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 space-y-6 animate-fade-in-delayed">
        
        {/* Section 1: Identity */}
        <div className="space-y-2 group">
            <label className="text-sm font-bold text-gray-700 flex items-center">
              Name <span className="text-red-500 ml-1">*</span>
            </label>
            <input
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-300 hover:border-gray-300"
                placeholder="e.g. Rahul"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
        </div>

        {/* Section 2: Stats */}
        <div className="grid grid-cols-4 gap-4">
             <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Age</label>
                <input 
                    type="number" 
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none"
                    placeholder="25"
                    onChange={e => setFormData({...formData, age: e.target.value})}
                />
            </div>
             <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Gender</label>
                <select className="w-full p-3 border rounded-lg bg-white" onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option>Male</option>
                    <option>Female</option>
                </select>
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Height (cm)</label>
                <input type="number" placeholder="170" className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, height: e.target.value})} />
            </div>
             <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Weight (kg)</label>
                <input type="number" placeholder="70" className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, weight: e.target.value})} />
            </div>
        </div>

        {/* --- GOAL SELECTION --- */}
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center">
                <Target size={16} className="mr-1 text-green-600"/> What is your Goal?
            </label>
            <select 
                className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none"
                value={formData.goal}
                onChange={e => setFormData({...formData, goal: e.target.value})}
            >
                <option value="Weight Loss">📉 Weight Loss</option>
                <option value="Muscle Gain">💪 Muscle Gain</option>
                <option value="Weight Gain">🥪 Weight Gain</option>
                <option value="Balanced Diet">🧘 Balanced Diet</option>
                <option value="Manage Medical Condition">🩺 Manage Medical Condition</option>
            </select>

            {/* --- CONDITIONAL INPUT: Only shows if "Medical Condition" is selected --- */}
            {formData.goal === "Manage Medical Condition" && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Please Specify Condition</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Thyroid, Hypertension, PCOD, High Cholesterol..."
                        className="w-full p-3 mt-1 border border-blue-200 bg-blue-50 rounded-lg text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={customCondition}
                        onChange={e => setCustomCondition(e.target.value)}
                    />
                </div>
            )}
        </div>

        {/* Section 3: Preferences */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cuisine</label>
                <select className="w-full p-3 border rounded-lg bg-white" onChange={e => setFormData({...formData, cuisine: e.target.value})}>
                    <option>North Indian</option>
                    <option>South Indian</option>
                    <option>Gujarati</option>
                    <option>Bengali</option>
                    <option>Maharashtrian</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Diet Type</label>
                <select className="w-full p-3 border rounded-lg bg-white" onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Vegetarian</option>
                    <option>Eggetarian</option>
                    <option>Non-Veg</option>
                    <option>Jain</option>
                    <option>Vegan</option>
                </select>
            </div>
        </div>

        {/* Section 4: AI Medical Analysis */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-blue-900 flex items-center">
                    <FileText size={18} className="mr-2"/> Medical Intelligence (Optional)
                </h3>
                <div className="flex items-center text-xs text-blue-600 bg-white px-2 py-1 rounded-full border border-blue-100 shadow-sm">
                    <Lock size={12} className="mr-1"/> 100% Private & Encrypted
                </div>
            </div>
            
            <p className="text-sm text-blue-700 mb-4">
                Upload a blood report PDF. Our AI will extract deficiencies and adjust your diet.
            </p>
            
            <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-200 font-bold shadow-sm hover:bg-blue-50 transition flex items-center">
                    {analyzing ? <Loader2 className="animate-spin mr-2"/> : <UploadCloud className="mr-2"/>}
                    {analyzing ? "Analyzing..." : "Upload PDF Report"}
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>

            {formData.medical_manual.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {formData.medical_manual.map((issue, i) => (
                        <span key={i} className={`text-sm px-3 py-1 rounded-full flex items-center border ${issue.includes('Action') ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                            <AlertCircle size={14} className="mr-1"/> {issue}
                        </span>
                    ))}
                </div>
            )}
            
            <p className="text-xs text-blue-400 mt-4 text-center">
                *Your report is processed in real-time and is NOT stored on our servers.
            </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || analyzing}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-600 transition-all duration-300 flex justify-center shadow-xl hover:shadow-2xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" />
              <span>Generating your plan...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Generate Personalized Plan</span>
              <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={20} />
            </div>
          )}
        </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UploadCloud, FileText, AlertCircle, ArrowLeft, Lock, Target, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateDiet, uploadReport } from '../components/api';
import { validateFormData, calculateBMI } from '../utils/healthValidation';
import PlanGenerationLoader from '../components/PlanGenerationLoader';

export default function UserForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Medical conditions state
  const [medicalConditions, setMedicalConditions] = useState({
    diabetes: false,
    thyroid: false,
    pcod: false,
    cholesterol: false,
    hypertension: false,
    other: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    height: '',
    weight: '',
    goal: 'Weight Loss',
    goal_pace: 'balanced', // New field: conservative, balanced, rapid
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

        // Check for validation errors
        if (res.data.error === "not_medical") {
            toast.error("⚠️ This doesn't look like a blood report. Please upload a valid medical lab report.");
            setAnalyzing(false);
            return;
        }

        if (res.data.error === "not_readable") {
            toast.error("⚠️ Could not read the PDF. Please ensure it's a clear, text-based document.");
            setAnalyzing(false);
            return;
        }

        if (res.data.issues && res.data.issues.length > 0) {
            setFormData(prev => ({
                ...prev,
                medical_manual: [...prev.medical_manual, ...res.data.issues]
            }));
            toast.success(`✅ Analysis Complete! Found: ${res.data.issues.length} issues`);
        } else {
            toast.success("✅ Report analyzed. No major issues found.");
        }
    } catch (error) {
        console.error(error);
        toast.dismiss(loadingToast);
        toast.error("❌ Could not analyze report. Please try again or check the file.");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async () => {
    // 1. BASIC VALIDATION
    if (!formData.name || !formData.age || !formData.height || !formData.weight) {
        toast.error("Please fill in all details (Name, Age, Height, Weight).");
        return;
    }

    // 2. REALISTIC VALUE VALIDATION
    const age = parseInt(formData.age);
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);

    // Age validation (5-120 years)
    if (age < 5 || age > 120) {
        toast.error("Please enter a valid age between 5 and 120 years.");
        return;
    }

    // Weight validation (20-300 kg)
    if (weight < 20 || weight > 300) {
        toast.error("Please enter a valid weight between 20 and 300 kg.");
        return;
    }

    // Height validation (50-250 cm)
    if (height < 50 || height > 250) {
        toast.error("Please enter a valid height between 50 and 250 cm.");
        return;
    }

    // BMI sanity check (extreme values)
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    if (bmi < 10 || bmi > 80) {
        toast.error("The height and weight combination seems unusual. Please verify your inputs.");
        return;
    }

    // 3. COMPREHENSIVE EDGE CASE VALIDATION
    const validationResults = validateFormData(formData, medicalConditions);

    // Check for critical errors first
    const errors = validationResults.filter(v => v.type === 'error');
    if (errors.length > 0) {
        // Show first critical error
        const error = errors[0];
        toast.error(error.message, { duration: 6000 });

        // If there's a suggested goal, offer to change it
        if (error.suggestion) {
            const bmiInfo = calculateBMI(weight, height);
            toast((t) => (
                <div>
                    <p className="font-semibold mb-2">Current BMI: {bmiInfo.bmi} ({bmiInfo.classification})</p>
                    <p className="text-sm mb-3">Consider changing your goal to: <strong>{error.suggestion}</strong></p>
                    <button
                        onClick={() => {
                            setFormData({...formData, goal: error.suggestion});
                            toast.dismiss(t.id);
                            toast.success(`Goal changed to ${error.suggestion}`);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm mr-2"
                    >
                        Change Goal
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
                    >
                        Cancel
                    </button>
                </div>
            ), { duration: 10000 });
        }
        return;
    }

    // Show warnings but allow to proceed
    const warnings = validationResults.filter(v => v.type === 'warning');
    if (warnings.length > 0) {
        for (const warning of warnings) {
            toast(warning.warning || warning.message, {
                icon: '⚠️',
                duration: 5000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E'
                }
            });
        }
    }

    setLoading(true);

    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // LOGIC: Combine selected medical conditions with blood report findings
      let finalMedicalTags = [...formData.medical_manual];

      // Add checked conditions
      if (medicalConditions.diabetes) finalMedicalTags.push('Diabetes/Pre-diabetes');
      if (medicalConditions.thyroid) finalMedicalTags.push('Thyroid Issues');
      if (medicalConditions.pcod) finalMedicalTags.push('PCOD/PCOS');
      if (medicalConditions.cholesterol) finalMedicalTags.push('High Cholesterol');
      if (medicalConditions.hypertension) finalMedicalTags.push('Hypertension');
      if (medicalConditions.other) finalMedicalTags.push(medicalConditions.other);

      const profile = {
        name: formData.name,
        phone: guestId,
        age: parseInt(formData.age),
        gender: formData.gender,
        height_cm: parseFloat(formData.height),
        weight_kg: parseFloat(formData.weight),
        goal: formData.goal,
        goal_pace: formData.goal_pace, // New field
        diet_pref: formData.type,
        region: formData.cuisine,
        budget: formData.budget,
        cooking_time: "Flexible",
        medical_manual: finalMedicalTags // Send the combined list
      };

      const res = await generateDiet(profile);

      // 3. SUCCESS - Navigate to dashboard
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
      toast.error("Error generating plan. Please try again.");
    }
    setLoading(false);
  };

  // Show loading screen when generating plan
  if (loading) {
    return <PlanGenerationLoader userName={formData.name} />;
  }

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
                    min="5"
                    max="120"
                    step="1"
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none"
                    placeholder="25"
                    onChange={e => setFormData({...formData, age: e.target.value})}
                />
            </div>
             <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Gender</label>
                <select
                    className="w-full p-3 border rounded-lg bg-white"
                    value={formData.gender}
                    onChange={e => {
                        const newGender = e.target.value;
                        setFormData({...formData, gender: newGender});
                        // Clear PCOD/PCOS if changing to Male
                        if (newGender === 'Male' && medicalConditions.pcod) {
                            setMedicalConditions({...medicalConditions, pcod: false});
                        }
                    }}
                >
                    <option>Male</option>
                    <option>Female</option>
                </select>
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Height (cm)</label>
                <input
                    type="number"
                    min="50"
                    max="250"
                    step="0.1"
                    placeholder="170"
                    className="w-full p-3 border rounded-lg"
                    onChange={e => setFormData({...formData, height: e.target.value})}
                />
            </div>
             <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-bold text-gray-700">Weight (kg)</label>
                <input
                    type="number"
                    min="20"
                    max="300"
                    step="0.1"
                    placeholder="70"
                    className="w-full p-3 border rounded-lg"
                    onChange={e => setFormData({...formData, weight: e.target.value})}
                />
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
            </select>
        </div>

        {/* --- GOAL PACE SELECTION (Only show for Weight Loss/Muscle Gain/Weight Gain) --- */}
        {['Weight Loss', 'Muscle Gain', 'Weight Gain'].includes(formData.goal) && (
            <div className="space-y-3 bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100">
                <label className="text-sm font-bold text-gray-800 flex items-center">
                    <Target size={16} className="mr-1 text-green-600"/> How fast do you want to achieve your goal?
                </label>
                <p className="text-xs text-gray-600 mb-2">
                    This helps us calculate precise calorie and protein targets based on your preference.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Conservative Option */}
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, goal_pace: 'conservative'})}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                            formData.goal_pace === 'conservative'
                                ? 'border-green-500 bg-white shadow-lg scale-105'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
                        }`}
                    >
                        <div className="font-bold text-gray-800 mb-1">🐢 Conservative</div>
                        <div className="text-xs text-gray-600">Slow & sustainable</div>
                        <div className="text-xs text-green-600 mt-2 font-semibold">
                            {formData.goal === 'Weight Loss' ? '~0.25-0.5 kg/week' : 'Gradual gains'}
                        </div>
                    </button>

                    {/* Balanced Option */}
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, goal_pace: 'balanced'})}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                            formData.goal_pace === 'balanced'
                                ? 'border-green-500 bg-white shadow-lg scale-105'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
                        }`}
                    >
                        <div className="font-bold text-gray-800 mb-1 flex items-center">
                            ⚡ Balanced
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
                        </div>
                        <div className="text-xs text-gray-600">Optimal pace</div>
                        <div className="text-xs text-green-600 mt-2 font-semibold">
                            {formData.goal === 'Weight Loss' ? '~0.5-0.75 kg/week' : 'Steady progress'}
                        </div>
                    </button>

                    {/* Rapid Option */}
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, goal_pace: 'rapid'})}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                            formData.goal_pace === 'rapid'
                                ? 'border-green-500 bg-white shadow-lg scale-105'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
                        }`}
                    >
                        <div className="font-bold text-gray-800 mb-1">🚀 Rapid</div>
                        <div className="text-xs text-gray-600">Short-term aggressive</div>
                        <div className="text-xs text-orange-600 mt-2 font-semibold">
                            {formData.goal === 'Weight Loss' ? '~0.75-1 kg/week' : 'Fast results'}
                        </div>
                    </button>
                </div>
            </div>
        )}


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

        {/* Section 4: Medical & Health Conditions (NEW - Always Visible) */}
        <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
            <h3 className="font-bold text-purple-900 flex items-center mb-3">
                <Stethoscope size={18} className="mr-2"/> Medical & Health Conditions (Optional)
            </h3>
            <p className="text-sm text-purple-700 mb-4">
                Select any conditions you have. We'll adjust your diet accordingly.
                {formData.gender === 'Female' && (
                    <span className="block mt-1 text-xs text-purple-600">
                        💡 Female-specific conditions like PCOD/PCOS are available below.
                    </span>
                )}
            </p>

            {/* Quick Select Common Conditions - Gender-specific filtering */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {/* Common conditions for all genders */}
                <label className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition">
                    <input
                        type="checkbox"
                        checked={medicalConditions.diabetes}
                        onChange={e => setMedicalConditions({...medicalConditions, diabetes: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Diabetes / Pre-diabetes</span>
                </label>

                <label className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition">
                    <input
                        type="checkbox"
                        checked={medicalConditions.thyroid}
                        onChange={e => setMedicalConditions({...medicalConditions, thyroid: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Thyroid Issues</span>
                </label>

                {/* PCOD/PCOS - Only show for Female */}
                {formData.gender === 'Female' && (
                    <label className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition">
                        <input
                            type="checkbox"
                            checked={medicalConditions.pcod}
                            onChange={e => setMedicalConditions({...medicalConditions, pcod: e.target.checked})}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700">PCOD / PCOS</span>
                    </label>
                )}

                <label className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition">
                    <input
                        type="checkbox"
                        checked={medicalConditions.cholesterol}
                        onChange={e => setMedicalConditions({...medicalConditions, cholesterol: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">High Cholesterol</span>
                </label>

                <label className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition">
                    <input
                        type="checkbox"
                        checked={medicalConditions.hypertension}
                        onChange={e => setMedicalConditions({...medicalConditions, hypertension: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Hypertension</span>
                </label>
            </div>

            {/* Other Condition Text Input */}
            <div className="mb-4">
                <label className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2 block">
                    Other Conditions
                </label>
                <input
                    type="text"
                    placeholder="e.g., Kidney issues, Fatty liver, Anemia..."
                    className="w-full p-3 border border-purple-200 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    value={medicalConditions.other}
                    onChange={e => setMedicalConditions({...medicalConditions, other: e.target.value})}
                />
            </div>
        </div>

        {/* Section 5: Blood Report Upload */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-blue-900 flex items-center">
                    <FileText size={18} className="mr-2"/> Upload Blood Report (Optional)
                </h3>
                <div className="flex items-center text-xs text-blue-600 bg-white px-2 py-1 rounded-full border border-blue-100 shadow-sm">
                    <Lock size={12} className="mr-1"/> 100% Private & Encrypted
                </div>
            </div>

            <p className="text-sm text-blue-700 mb-3">
                Upload your blood test report for AI-powered deficiency detection and diet optimization.
            </p>

            {/* Visual Guide for Valid Reports */}
            <div className="bg-blue-100 p-3 rounded-lg mb-4 text-xs">
                <div className="font-semibold text-blue-900 mb-1">✅ Accepted Reports:</div>
                <div className="text-blue-700 mb-2">Blood test reports from labs (Thyrocare, Dr. Lal PathLabs, SRL, etc.)</div>
                <div className="font-semibold text-blue-900 mb-1">❌ Not Accepted:</div>
                <div className="text-blue-700">Prescriptions, X-rays, invoices, or general documents</div>
            </div>
            
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
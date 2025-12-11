import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, Utensils } from 'lucide-react';

export default function PlanList() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state?.plans || state.plans.length === 0) {
    return <div className="p-10 text-center">No plans found.</div>;
  }

  const openPlan = (plan) => {
    navigate('/plan', { 
        state: { 
            plan: plan.diet, 
            planId: plan.id,
            userId: state.user.id 
        } 
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate('/')} className="mr-4 text-gray-400 hover:text-green-600">
            <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">My Diet Plans</h1>
      </div>

      <div className="space-y-4">
        {state.plans.map((plan) => (
          <div 
            key={plan.id} 
            onClick={() => openPlan(plan)}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 cursor-pointer transition flex justify-between items-center group"
          >
            <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-green-700 transition">
                    {plan.title || "Untitled Plan"}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar size={14} className="mr-1"/> 
                    {new Date(plan.created_at).toLocaleDateString()}
                    <span className="mx-2">•</span>
                    <Utensils size={14} className="mr-1"/> 
                    7 Day Plan
                </div>
            </div>
            <div className="text-gray-300 group-hover:text-green-500 transition">
                <ChevronRight size={24} />
            </div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => navigate('/start')}
        className="mt-8 w-full py-4 border-2 border-dashed border-green-200 text-green-700 rounded-xl font-bold hover:bg-green-50 transition"
      >
        + Create New Plan
      </button>
    </div>
  );
}
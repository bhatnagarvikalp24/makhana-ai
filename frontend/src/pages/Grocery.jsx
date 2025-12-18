import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ExternalLink, Rocket, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center">
          <button
              onClick={() => navigate('/start')}
              className="mr-4 text-gray-400 hover:text-green-600 transition group"
          >
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <ShoppingBag className="mr-2 text-green-600"/> Weekly Grocery List
          </h1>
        </div>

        {/* Download PDF Button */}
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <Download size={18} className="mr-2"/> Download PDF
        </button>
      </div>

      {/* GROCERY LIST - Printable Area */}
      <div id="grocery-printable">
        {/* Header for PDF */}
        <div className="mb-6 text-center print:block hidden">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Grocery List</h1>
          <p className="text-gray-600">Ghar-Ka-Khana - AI-Powered Nutrition</p>
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
                {(cat.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition print:hover:bg-transparent">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mr-3 print:bg-black"></div>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </div>

                    {/* BLINKIT BUY BUTTON - Hidden in print */}
                    <button
                      onClick={() => buyItem(item)}
                      className="text-xs text-yellow-700 font-bold border border-yellow-300 bg-yellow-50 px-3 py-1.5 rounded flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-yellow-100 shadow-sm print:hidden"
                    >
                      Buy on Blinkit <ExternalLink size={12} className="ml-1"/>
                    </button>
                  </div>
                ))}
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
  );
}
import React, { useState } from 'react';
import { SearchParams, Lead, ProcessingStatus } from './types';
import { searchCandidatesOnMaps, analyzeLeadWithThinking } from './services/geminiService';
import LeadTable from './components/LeadTable';
import ChatAssistant from './components/ChatAssistant';
import { Search, Map, Globe, Download, X, Building, Star, Phone, Mail, ExternalLink, BrainCircuit } from 'lucide-react';

// Use standard enum for Buyer Types
enum BuyerType {
    IMPORTER = 'importer',
    DISTRIBUTOR = 'distributor',
    WHOLESALER = 'wholesaler',
    RETAILER = 'retailer',
    B2B = 'B2B'
}

const App: React.FC = () => {
  const [params, setParams] = useState<SearchParams>({
    productKeyword: '',
    targetCountry: '',
    targetCity: '',
    buyerType: 'importer', // Default is string literal matching type, but logic can handle enum value
    languagePreference: 'English',
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progressMsg, setProgressMsg] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.productKeyword || !params.targetCountry) return;

    setStatus(ProcessingStatus.SEARCHING_MAPS);
    setLeads([]);
    setProgressMsg('Scanning Google Maps for potential candidates...');

    try {
      // 1. Discovery Phase
      const candidates = await searchCandidatesOnMaps(params);
      
      if (candidates.length === 0) {
        setStatus(ProcessingStatus.COMPLETED);
        setProgressMsg('No results found on Maps.');
        return;
      }

      setStatus(ProcessingStatus.ANALYZING_AI);
      setProgressMsg(`Found ${candidates.length} candidates. Gemini is now thinking & analyzing each one...`);

      // 2. Analysis Phase (Parallel but with visual updates)
      const analyzedLeads: Lead[] = [];
      
      // Process in small batches to not hit rate limits too hard, but user experience is key
      for (let i = 0; i < candidates.length; i++) {
        setProgressMsg(`Analyzing candidate ${i + 1} of ${candidates.length}: ${candidates[i].name}...`);
        const lead = await analyzeLeadWithThinking(candidates[i], params);
        analyzedLeads.push(lead);
        // Update list progressively
        setLeads([...analyzedLeads]);
      }

      setStatus(ProcessingStatus.COMPLETED);
      setProgressMsg('Analysis complete!');
      
    } catch (error) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
      setProgressMsg('An error occurred during the search process.');
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;
    
    const headers = ["Name", "Score", "Type", "Country", "City", "Product Focus", "Website", "Email", "Phone", "Action Suggestion"];
    const rows = leads.map(l => [
        `"${l.name}"`,
        l.fit_score,
        l.buyer_type_detected,
        l.country,
        l.city,
        `"${l.product_focus}"`,
        l.website_url || '',
        l.email || '',
        l.phone || '',
        `"${l.next_action_suggestion}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_${params.productKeyword}_${params.targetCountry}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Globe className="text-brand-600" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                    Global Export Market Finder
                </h1>
            </div>
            <div className="text-sm text-slate-500 hidden sm:block">
                Powered by Gemini 2.5 Flash & 3 Pro
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Keyword</label>
              <input
                type="text"
                name="productKeyword"
                required
                placeholder="e.g., Teak Furniture, Frozen Shrimp"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                value={params.productKeyword}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Country</label>
              <input
                type="text"
                name="targetCountry"
                required
                placeholder="e.g., Japan, Germany"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                value={params.targetCountry}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target City (Optional)</label>
              <input
                type="text"
                name="targetCity"
                placeholder="e.g., Tokyo, Berlin"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                value={params.targetCity}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Buyer Type</label>
              <select
                name="buyerType"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white transition"
                value={params.buyerType}
                onChange={handleInputChange}
              >
                <option value={BuyerType.IMPORTER}>Importer</option>
                <option value={BuyerType.DISTRIBUTOR}>Distributor</option>
                <option value={BuyerType.WHOLESALER}>Wholesaler</option>
                <option value={BuyerType.RETAILER}>Retailer</option>
                <option value={BuyerType.B2B}>General B2B</option>
              </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">AI Language</label>
                <select 
                    name="languagePreference"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white transition"
                    value={params.languagePreference}
                    onChange={handleInputChange}
                >
                    <option value="English">English</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Japanese">Japanese</option>
                </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={status === ProcessingStatus.SEARCHING_MAPS || status === ProcessingStatus.ANALYZING_AI}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {status === ProcessingStatus.SEARCHING_MAPS || status === ProcessingStatus.ANALYZING_AI ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Searching...
                    </>
                ) : (
                    <>
                        <Search size={20} />
                        Find Buyers
                    </>
                )}
              </button>
            </div>
          </form>

          {/* Progress Indicator */}
          {(status === ProcessingStatus.SEARCHING_MAPS || status === ProcessingStatus.ANALYZING_AI) && (
             <div className="mt-4 p-4 bg-brand-50 rounded-lg border border-brand-100 flex items-center gap-3 animate-pulse">
                <BrainCircuit className="text-brand-600 animate-pulse" />
                <span className="text-brand-800 font-medium">{progressMsg}</span>
             </div>
          )}
        </section>

        {/* Results Section */}
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Potential Buyers Found ({leads.length})</h2>
                <button 
                    onClick={exportToCSV}
                    disabled={leads.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-50 transition"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            <LeadTable leads={leads} onSelectLead={setSelectedLead} />
        </section>
      </main>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-start z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedLead.name}</h2>
                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                        <MapPinIcon size={16} />
                        <span>{selectedLead.address}</span>
                    </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <X size={24} className="text-slate-500" />
                </button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Score & Type */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fit Score</div>
                        <div className="flex items-center gap-2">
                            <span className={`text-3xl font-bold ${
                                selectedLead.fit_score >= 4 ? 'text-green-600' : selectedLead.fit_score === 3 ? 'text-yellow-600' : 'text-red-500'
                            }`}>{selectedLead.fit_score}/5</span>
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < selectedLead.fit_score ? "currentColor" : "none"} stroke="currentColor" className={i < selectedLead.fit_score ? "" : "text-slate-300"} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Detected Type</div>
                        <div className="text-xl font-semibold text-slate-800 capitalize">{selectedLead.buyer_type_detected}</div>
                    </div>
                </div>

                {/* AI Summary */}
                <div className="bg-brand-50 p-5 rounded-xl border border-brand-100 relative">
                    <div className="absolute top-4 right-4 text-brand-300">
                        <BrainCircuit size={24} />
                    </div>
                    <h3 className="font-semibold text-brand-900 mb-2">AI Analysis</h3>
                    <p className="text-brand-800 leading-relaxed whitespace-pre-wrap">{selectedLead.ai_summary}</p>
                </div>

                {/* Product Focus */}
                <div>
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Building size={18} className="text-slate-500" />
                        Product Focus
                    </h3>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedLead.product_focus}</p>
                </div>

                {/* Contact & Socials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Contact Info</h3>
                        <div className="space-y-2 text-sm">
                            {selectedLead.website_url && (
                                <a href={selectedLead.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-600 hover:underline">
                                    <Globe size={16} /> Website
                                </a>
                            )}
                            {selectedLead.phone && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={16} /> {selectedLead.phone}
                                </div>
                            )}
                            {selectedLead.email && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail size={16} /> {selectedLead.email}
                                </div>
                            )}
                             {selectedLead.maps_url && (
                                <a href={selectedLead.maps_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                                    <Map size={16} /> View on Maps
                                </a>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Social Profiles</h3>
                        <div className="space-y-2 text-sm">
                            {selectedLead.linkedin_url ? (
                                <a href={selectedLead.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#0077b5] hover:underline font-medium">
                                    <ExternalLink size={16} /> LinkedIn Profile
                                </a>
                            ) : <span className="text-slate-400 italic">No LinkedIn found</span>}
                            
                            {selectedLead.instagram_url && (
                                <a href={selectedLead.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#E1306C] hover:underline font-medium">
                                    <ExternalLink size={16} /> Instagram
                                </a>
                            )}
                             {selectedLead.facebook_url && (
                                <a href={selectedLead.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#1877F2] hover:underline font-medium">
                                    <ExternalLink size={16} /> Facebook
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Next Action */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <h3 className="font-bold text-green-800 mb-2">Recommended Next Action</h3>
                    <p className="text-green-700">{selectedLead.next_action_suggestion}</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Assistant */}
      <ChatAssistant />
    </div>
  );
};

// Helper Icon component
const MapPinIcon = ({ size }: { size: number }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
);

export default App;

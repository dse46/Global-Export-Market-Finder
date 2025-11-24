import React from 'react';
import { Lead } from '../types';
import { ExternalLink, Star, MapPin, Globe, Linkedin, Instagram, Facebook } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const LeadTable: React.FC<LeadTableProps> = ({ leads, onSelectLead }) => {
  if (leads.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-slate-200">
        <p className="text-slate-500">No leads found yet. Start a search to see results.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-200">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
          <tr>
            <th className="p-4 w-12">Fit</th>
            <th className="p-4">Company Name</th>
            <th className="p-4">Type</th>
            <th className="p-4">Location</th>
            <th className="p-4">Product Focus</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onSelectLead(lead)}>
              <td className="p-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                  lead.fit_score >= 4 ? 'bg-green-500' : lead.fit_score === 3 ? 'bg-yellow-500' : 'bg-red-400'
                }`}>
                  {lead.fit_score}
                </div>
              </td>
              <td className="p-4 font-medium text-slate-900">
                {lead.name}
                {lead.website_url && (
                    <a href={lead.website_url} target="_blank" rel="noreferrer" className="ml-2 inline-block text-brand-500 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                        <Globe size={14} />
                    </a>
                )}
              </td>
              <td className="p-4">
                <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium border border-slate-200">
                  {lead.buyer_type_detected}
                </span>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{lead.city}, {lead.country}</span>
                </div>
              </td>
              <td className="p-4 max-w-xs truncate" title={lead.product_focus}>
                {lead.product_focus}
              </td>
              <td className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-700 hover:opacity-80"><Linkedin size={16} /></a>}
                    {lead.instagram_url && <a href={lead.instagram_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-pink-600 hover:opacity-80"><Instagram size={16} /></a>}
                    {lead.facebook_url && <a href={lead.facebook_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:opacity-80"><Facebook size={16} /></a>}
                    <button className="text-brand-600 hover:text-brand-800 text-xs font-semibold px-2 py-1 rounded border border-brand-200 hover:bg-brand-50">
                        Details
                    </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;

export interface SearchParams {
  productKeyword: string;
  targetCountry: string;
  targetCity?: string;
  buyerType: 'importer' | 'distributor' | 'wholesaler' | 'retailer' | 'B2B';
  languagePreference: string;
}

export interface Lead {
  id: string;
  name: string;
  country: string;
  city: string;
  address?: string;
  buyer_type_detected: string;
  product_focus: string;
  fit_score: number; // 1-5
  website_url?: string;
  email?: string;
  phone?: string;
  maps_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  ai_summary: string;
  next_action_suggestion: string;
  source_tags: string[];
}

export interface ProcessingStep {
  id: number;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export enum ProcessingStatus {
  IDLE = 'idle',
  SEARCHING_MAPS = 'searching_maps',
  ANALYZING_AI = 'analyzing_ai',
  COMPLETED = 'completed',
  ERROR = 'error'
}
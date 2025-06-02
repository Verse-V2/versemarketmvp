import { firebaseService } from './firebase-service';

export interface PredictionsConfig {
  predictionFilters: string[];
}

interface FirebaseConfig {
  currentNFLWeek: string;
  currentSeason: string;
  seasonStatus: string;
  predictionFilters?: string[];
  feePercentage?: number;
  maxPredictionOdds?: number;
  minPredictionOdds?: number;
  safeguards?: {
    maxParlayLegs: number;
    maxRiskAmount: number;
    maxTotalOdds: number;
    minTotalOdds: number;
  };
  stateList?: Array<{
    name: string;
    stateCode: string;
    valid: boolean;
  }>;
  validStatesURL?: string;
  [key: string]: string | number | { __time__: number } | string[] | undefined | {
    maxParlayLegs: number;
    maxRiskAmount: number;
    maxTotalOdds: number;
    minTotalOdds: number;
  } | Array<{
    name: string;
    stateCode: string;
    valid: boolean;
  }>;
}

export async function getPredictionsFilters(): Promise<PredictionsConfig['predictionFilters']> {
  try {
    const config = await firebaseService.getConfig() as FirebaseConfig;
    let filters: string[] = [];
    
    if (config && config.predictionFilters) {
      filters = config.predictionFilters;
    } else {
      // Default filters if not found in config
      filters = [
        "All",
        "Popular",
        "Trending"
      ];
    }
    
    // Always ensure Fantasy Football is included
    if (!filters.includes("Fantasy Football")) {
      filters.push("Fantasy Football");
    }
    
    return filters;
  } catch (error) {
    console.error("Error fetching predictions filters:", error);
    return ["All", "Fantasy Football"]; // Fallback with at least Fantasy Football
  }
} 
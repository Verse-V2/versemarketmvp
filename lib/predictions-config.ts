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
    if (config && config.predictionFilters) {
      return config.predictionFilters;
    }
    
    // Default filters if not found in config
    return [
      "All",
      "Popular",
      "Featured"
    ];
  } catch (error) {
    console.error("Error fetching predictions filters:", error);
    return [];
  }
} 
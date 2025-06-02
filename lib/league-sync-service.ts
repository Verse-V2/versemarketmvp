// Types for the sync request based on iOS implementation
export interface SyncLeagueRequest {
  leagueId: string;
  leagueType: string;
  userId: string;
  espnSWID?: string;
  espnSWID2?: string;
  yahooRefreshToken?: string;
}

export interface SyncLeagueResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface LeagueSyncResult {
  success: boolean;
  message?: string;
  shouldRefreshData: boolean;
}

class LeagueSyncService {
  private readonly apiEndpoint = '/api/league-sync/sync-league';
  private readonly defaultCooldownMinutes = 5; // 5 minutes cooldown by default
  
  // Store last sync times to prevent excessive calls
  private lastSyncTimes: Map<string, number> = new Map();

  /**
   * Check if enough time has passed since last sync to allow another sync
   */
  private shouldAllowSync(leagueId: string, cooldownMinutes: number = this.defaultCooldownMinutes): boolean {
    const lastSync = this.lastSyncTimes.get(leagueId);
    if (!lastSync) return true;
    
    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (now - lastSync) >= cooldownMs;
  }

  /**
   * Record the sync time for a league
   */
  private recordSyncTime(leagueId: string): void {
    this.lastSyncTimes.set(leagueId, Date.now());
  }

  /**
   * Get the time since last sync in a human-readable format
   */
  getTimeSinceLastSync(leagueId: string): string {
    const lastSync = this.lastSyncTimes.get(leagueId);
    if (!lastSync) return 'Never synced';
    
    const now = Date.now();
    const diffMs = now - lastSync;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Call the cloud function to sync league data
   */
  async syncLeagueData(request: SyncLeagueRequest, authToken: string, forcSync: boolean = false, cooldownMinutes?: number): Promise<LeagueSyncResult> {
    const { leagueId } = request;
    
    // Check cooldown unless forcing sync
    if (!forcSync && !this.shouldAllowSync(leagueId, cooldownMinutes)) {
      const timeSince = this.getTimeSinceLastSync(leagueId);
      return {
        success: true,
        message: `League was recently synced (${timeSince}). Skipping sync.`,
        shouldRefreshData: true // Still refresh from Firebase even if not syncing
      };
    }

    try {
      console.log('Calling league sync API for league:', leagueId);
      
      // Call our API route instead of the cloud function directly
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          leagueId: request.leagueId,
          leagueType: request.leagueType,
          userId: request.userId,
          ...(request.espnSWID && { espnSWID: request.espnSWID }),
          ...(request.espnSWID2 && { espnSWID2: request.espnSWID2 }),
          ...(request.yahooRefreshToken && { yahooRefreshToken: request.yahooRefreshToken })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('League sync API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        return {
          success: false,
          message: errorData?.message || `Sync failed with status ${response.status}`,
          shouldRefreshData: true // Still try to refresh existing data
        };
      }

      await response.json();
      
      // Record successful sync time
      this.recordSyncTime(leagueId);
      
      console.log('League sync completed successfully for league:', leagueId);
      
      return {
        success: true,
        message: 'League data synced successfully',
        shouldRefreshData: true
      };
      
    } catch (error) {
      console.error('Error calling league sync API:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown sync error',
        shouldRefreshData: true // Still try to refresh existing data
      };
    }
  }

  /**
   * Sync league and then fetch updated data
   * This is the main method that replicates the iOS flow
   */
  async syncAndRefreshLeague(
    leagueId: string,
    leagueType: string,
    userId: string,
    authToken: string,
    options?: {
      espnSWID?: string;
      espnSWID2?: string;
      yahooRefreshToken?: string;
      forceSync?: boolean;
      cooldownMinutes?: number;
    }
  ): Promise<LeagueSyncResult> {
    const syncRequest: SyncLeagueRequest = {
      leagueId,
      leagueType,
      userId,
      ...(options?.espnSWID && { espnSWID: options.espnSWID }),
      ...(options?.espnSWID2 && { espnSWID2: options.espnSWID2 }),
      ...(options?.yahooRefreshToken && { yahooRefreshToken: options.yahooRefreshToken })
    };

    // First sync the league data via cloud function
    const syncResult = await this.syncLeagueData(
      syncRequest, 
      authToken,
      options?.forceSync || false,
      options?.cooldownMinutes
    );

    return syncResult;
  }
}

export const leagueSyncService = new LeagueSyncService(); 
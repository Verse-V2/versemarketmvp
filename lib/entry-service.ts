// Types for the entry update request based on iOS implementation
export interface UpdateEntriesRequest {
  userId: string;
}

export interface UpdateEntriesResponse {
  success: boolean;
}

export interface EntryUpdateResult {
  success: boolean;
  message?: string;
  shouldRefreshData: boolean;
}

class EntryService {
  private readonly apiEndpoint = '/api/entries/update-fantasy';
  private readonly defaultCooldownMinutes = 30; // 30 minutes cooldown by default (matching iOS)
  
  // Store last update times to prevent excessive calls
  private lastUpdateTimes: Map<string, number> = new Map();
  
  // Auto-refresh timer
  private autoRefreshTimer: NodeJS.Timeout | null = null;

  /**
   * Check if enough time has passed since last update to allow another update
   */
  private shouldAllowUpdate(userId: string, cooldownMinutes: number = this.defaultCooldownMinutes): boolean {
    console.log('EntryService: Checking if update is allowed for user:', userId, 'cooldown:', cooldownMinutes, 'minutes');
    
    const lastUpdate = this.lastUpdateTimes.get(userId);
    console.log('EntryService: Last update time from memory:', lastUpdate);
    
    if (!lastUpdate) {
      console.log('EntryService: No last update time found, allowing update');
      return true;
    }
    
    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceUpdate = now - lastUpdate;
    const shouldAllow = timeSinceUpdate >= cooldownMs;
    
    console.log('EntryService: Update check details:', {
      now,
      lastUpdate,
      timeSinceUpdate: Math.floor(timeSinceUpdate / 1000) + 's',
      cooldownMs,
      shouldAllow
    });
    
    return shouldAllow;
  }

  /**
   * Record the update time for a user
   */
  private recordUpdateTime(userId: string): void {
    const timestamp = Date.now();
    console.log('EntryService: Recording update time for user:', userId, 'timestamp:', timestamp);
    this.lastUpdateTimes.set(userId, timestamp);
    // Also store in localStorage for persistence
    localStorage.setItem(`lastEntriesUpdate_${userId}`, timestamp.toString());
    console.log('EntryService: Update time recorded in memory and localStorage');
  }

  /**
   * Get the time since last update in a human-readable format
   */
  getTimeSinceLastUpdate(userId: string): string {
    console.log('EntryService: Getting time since last update for user:', userId);
    
    const stored = localStorage.getItem(`lastEntriesUpdate_${userId}`);
    const lastUpdate = stored ? parseInt(stored) : this.lastUpdateTimes.get(userId);
    
    console.log('EntryService: Last update time:', { stored, lastUpdate });
    
    if (!lastUpdate) {
      console.log('EntryService: No update time found, returning "Never updated"');
      return 'Never updated';
    }
    
    const now = Date.now();
    const diffMs = now - lastUpdate;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    let result = '';
    if (diffDays > 0) {
      result = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      result = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      result = `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    
    console.log('EntryService: Time since last update:', result);
    return result;
  }

  /**
   * Call the cloud function to update fantasy matchup entries
   */
  async updateFantasyMatchupEntries(userId: string, authToken: string, forceUpdate: boolean = false, cooldownMinutes?: number): Promise<EntryUpdateResult> {
    console.log('EntryService: updateFantasyMatchupEntries called with:', {
      userId,
      authTokenLength: authToken?.length || 0,
      forceUpdate,
      cooldownMinutes
    });

    // Check cooldown unless forcing update
    if (!forceUpdate && !this.shouldAllowUpdate(userId, cooldownMinutes)) {
      const timeSince = this.getTimeSinceLastUpdate(userId);
      const result = {
        success: true,
        message: `Entries were recently updated (${timeSince}). Skipping update.`,
        shouldRefreshData: true // Still refresh from Firebase even if not updating
      };
      console.log('EntryService: Skipping update due to cooldown:', result);
      return result;
    }

    try {
      console.log('EntryService: Starting API call to:', this.apiEndpoint);
      console.log('EntryService: Request payload:', { userId });
      
      const requestStart = Date.now();
      
      // Call our API route instead of the cloud function directly
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId
        }),
      });

      const requestDuration = Date.now() - requestStart;
      console.log('EntryService: API request completed in', requestDuration + 'ms', 'with status:', response.status);

      if (!response.ok) {
        console.error('EntryService: API request failed with status:', response.status, response.statusText);
        
        const errorData = await response.json().catch((e) => {
          console.error('EntryService: Failed to parse error response as JSON:', e);
          return null;
        });
        
        console.error('EntryService: Error response data:', errorData);
        
        return {
          success: false,
          message: errorData?.message || `Update failed with status ${response.status}`,
          shouldRefreshData: true // Still try to refresh existing data
        };
      }

      console.log('EntryService: Parsing successful response...');
      const responseData: UpdateEntriesResponse = await response.json();
      console.log('EntryService: Response data:', responseData);
      
      // Record successful update time
      this.recordUpdateTime(userId);
      
      console.log('EntryService: Update completed successfully for user:', userId);
      
      const result = {
        success: responseData.success,
        message: 'Entries updated successfully',
        shouldRefreshData: true
      };
      console.log('EntryService: Returning result:', result);
      return result;
      
    } catch (error) {
      console.error('EntryService: Exception in updateFantasyMatchupEntries:', error);
      console.error('EntryService: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown update error',
        shouldRefreshData: true // Still try to refresh existing data
      };
    }
  }

  /**
   * Check and update entries if needed (matching iOS checkAndUpdateEntriesIfNeeded)
   */
  async checkAndUpdateEntriesIfNeeded(userId: string, authToken: string, cooldownMinutes?: number): Promise<EntryUpdateResult> {
    console.log('EntryService: checkAndUpdateEntriesIfNeeded called with:', {
      userId,
      authTokenLength: authToken?.length || 0,
      cooldownMinutes
    });
    
    const result = await this.updateFantasyMatchupEntries(userId, authToken, false, cooldownMinutes);
    console.log('EntryService: checkAndUpdateEntriesIfNeeded result:', result);
    return result;
  }

  /**
   * Force refresh entries (bypassing cooldown, matching iOS refreshEntries)
   */
  async refreshEntries(userId: string, authToken: string): Promise<EntryUpdateResult> {
    console.log('EntryService: refreshEntries called with:', {
      userId,
      authTokenLength: authToken?.length || 0
    });
    
    const result = await this.updateFantasyMatchupEntries(userId, authToken, true);
    console.log('EntryService: refreshEntries result:', result);
    return result;
  }

  /**
   * Start auto-refresh timer (matching iOS startAutoRefreshTimer - every 2 minutes)
   */
  startAutoRefreshTimer(userId: string, getAuthToken: () => Promise<string>): void {
    console.log('EntryService: Starting auto-refresh timer for user:', userId);
    
    // Clear existing timer
    this.stopAutoRefreshTimer();

    // Auto-refresh every 2 minutes (like iOS app)
    this.autoRefreshTimer = setInterval(async () => {
      console.log('EntryService: Auto-refresh timer triggered for user:', userId);
      try {
        const authToken = await getAuthToken();
        console.log('EntryService: Got auth token for auto-refresh, length:', authToken?.length || 0);
        await this.checkAndUpdateEntriesIfNeeded(userId, authToken);
        console.log('EntryService: Auto-refresh completed for user:', userId);
      } catch (error) {
        console.error('EntryService: Auto-refresh failed for user:', userId, error);
      }
    }, 120000); // 2 minutes in milliseconds
    
    console.log('EntryService: Auto-refresh timer started successfully');
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefreshTimer(): void {
    if (this.autoRefreshTimer) {
      console.log('EntryService: Stopping auto-refresh timer');
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    } else {
      console.log('EntryService: No auto-refresh timer to stop');
    }
  }

  /**
   * Initialize last update times from localStorage
   */
  initializeFromStorage(userId: string): void {
    console.log('EntryService: Initializing from storage for user:', userId);
    
    const stored = localStorage.getItem(`lastEntriesUpdate_${userId}`);
    console.log('EntryService: Found stored timestamp:', stored);
    
    if (stored) {
      const timestamp = parseInt(stored);
      this.lastUpdateTimes.set(userId, timestamp);
      console.log('EntryService: Initialized last update time:', timestamp);
    } else {
      console.log('EntryService: No stored timestamp found');
    }
  }
}

export const entryService = new EntryService(); 
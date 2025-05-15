import { getFirestore, doc, getDoc } from 'firebase/firestore';

export interface DailyChallengeTask {
  id: string;
  title: string;
  description: string;
  type: string;
  order: number;
  requirements: {
    type: string;
    minLegs?: number;
    marketType?: string;
  };
}

export interface DailyChallenge {
  date: string;
  title: string;
  description: string;
  rewardAmount: number;
  totalTasks: number;
  tasks: DailyChallengeTask[];
  stats: {
    completedUsers: number;
    completionRate: number;
    totalUsers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const dailyChallengesService = {
  async getDailyChallenge(date: string): Promise<DailyChallenge | null> {
    try {
      console.log('Fetching daily challenge for date:', date);
      const db = getFirestore();
      const challengeDoc = await getDoc(doc(db, 'dailyChallenges', date));
      
      if (!challengeDoc.exists()) {
        console.log('No daily challenge found for date:', date);
        return null;
      }

      const data = challengeDoc.data() as DailyChallenge;
      console.log('Successfully fetched daily challenge:', {
        date: data.date,
        title: data.title,
        totalTasks: data.totalTasks,
        tasks: data.tasks.map(t => ({ id: t.id, title: t.title }))
      });
      return data;
    } catch (error) {
      console.error('Error fetching daily challenge:', {
        date,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      return null;
    }
  },

  async getUserChallengeProgress(userId: string, date: string): Promise<Record<string, boolean>> {
    try {
      console.log('Fetching user challenge progress:', {
        userId,
        date,
        path: `users/${userId}/dailyChallenges/${date}`
      });
      
      const db = getFirestore();
      const progressDoc = await getDoc(doc(db, 'users', userId, 'dailyChallenges', date));
      
      if (!progressDoc.exists()) {
        console.log('No progress found for user:', {
          userId,
          date,
          path: `users/${userId}/dailyChallenges/${date}`
        });
        return {};
      }

      const data = progressDoc.data().completedTasks || {};
      console.log('Successfully fetched user progress:', {
        userId,
        date,
        completedTasks: Object.keys(data).length,
        taskIds: Object.keys(data)
      });
      return data;
    } catch (error) {
      console.error('Error fetching user challenge progress:', {
        userId,
        date,
        path: `users/${userId}/dailyChallenges/${date}`,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      return {};
    }
  }
}; 
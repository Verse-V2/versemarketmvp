import { getFirestore, doc, getDoc, query, collection, where, getDocs, Timestamp } from 'firebase/firestore';

export interface FirestoreTime {
  __time__: string;
}

export interface DailyChallengeTask {
  id: string;
  title: string;
  description: string;
  type: string;
  requirements: Record<string, unknown>;
}

export interface DailyChallenge {
  date: string; // ISO string
  title: string;
  description: string;
  rewardAmount: number;
  tasks: DailyChallengeTask[];
  stats: {
    completedUsers: number;
    completionRate: number;
    totalUsers: number;
  };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  id: string;
  totalTasks: number; // computed
}

export const dailyChallengesService = {
  async getDailyChallenge(date: string): Promise<DailyChallenge | null> {
    try {
      console.log('Fetching daily challenge for date:', date);
      const db = getFirestore();
      // Calculate start and end of the day in UTC
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const startOfNextDay = new Date(new Date(startOfDay).setUTCDate(startOfDay.getUTCDate() + 1));
      const q = query(
        collection(db, 'dailyChallenges'),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<', Timestamp.fromDate(startOfNextDay))
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log('No daily challenge found for date:', date);
        return null;
      }
      const raw = querySnapshot.docs[0].data() as Record<string, unknown>;
      // Parse Firestore timestamps and structure
      const challenge: DailyChallenge = {
        id: raw.id as string,
        title: raw.title as string,
        description: raw.description as string,
        rewardAmount: raw.rewardAmount as number,
        tasks: (raw.tasks as DailyChallengeTask[] || []).map((task: unknown) => {
          const t = task as Record<string, unknown>;
          return {
            id: t.id as string,
            title: t.title as string,
            description: t.description as string,
            type: t.type as string,
            requirements: t.requirements as Record<string, unknown> || {},
          };
        }),
        stats: (raw.stats as { completedUsers: number; completionRate: number; totalUsers: number }) || { completedUsers: 0, completionRate: 0, totalUsers: 0 },
        createdAt: (raw.createdAt as Timestamp)?.toDate().toISOString() || '',
        updatedAt: (raw.updatedAt as Timestamp)?.toDate().toISOString() || '',
        date: (raw.date as Timestamp)?.toDate().toISOString() || '',
        totalTasks: ((raw.tasks as unknown[]) || []).length,
      };
      console.log('Successfully fetched daily challenge:', {
        date: challenge.date,
        title: challenge.title,
        totalTasks: challenge.totalTasks,
        tasks: challenge.tasks.map(t => ({ id: t.id, title: t.title }))
      });
      return challenge;
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
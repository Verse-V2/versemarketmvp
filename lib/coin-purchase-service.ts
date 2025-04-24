import { collection, query, where, getDocs, getFirestore } from "firebase/firestore";

export interface CoinPurchasePackage {
  id: string;
  coinAmount: number;
  cashAmount: number;
  price: number;
  isActive: boolean;
  isDiscounted: boolean;
  discountPercentage?: number;
  maxPurchasesPerUser: number;
  userPurchases: Array<{
    userId: string;
    count: number;
  }>;
}

export async function getActiveCoinPurchasePackages(): Promise<CoinPurchasePackage[]> {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, 'coinPurchasePackages'),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    const activePackages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CoinPurchasePackage[];
    
    // Sort packages by price
    return activePackages.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error('Error fetching coin purchase packages:', error);
    return [];
  }
} 
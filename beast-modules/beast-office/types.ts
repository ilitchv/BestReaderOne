// PASTE YOUR types.ts CODE HERE

export enum UserRank {
  NORMAL = 'Normal',
  AGENTE = 'Agente',
  SOCIO = 'Socio',
  MANAGER = 'Manager'
}

export enum UserStatus {
  ACTIVE = 'Active',
  PENDING = 'Pending',
  INACTIVE = 'Inactive'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  rank: UserRank;
  status: UserStatus;
  sponsorId?: string;
  sponsorName?: string;
  referralCode: string;
  personalVolume: number;
  groupVolume: number;
  directActiveCount: number;
  levels: {
    direct: number;
    indirect: number;
    deep: number;
  };
  kycVerified: boolean;
  walletRegistered: boolean;
  commissionBalance: {
    tokens: number;
    btc: number;
  };
  children?: User[];
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string;
  level: 1 | 2 | 3;
  commissionEarned: number;
}

export type ViewType = 'directory' | 'tree' | 'commissions' | 'reports' | 'config';

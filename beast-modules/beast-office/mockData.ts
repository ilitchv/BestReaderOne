
import { User, UserRank, UserStatus, Transaction } from '../../types';

export const MOCK_USERS: User[] = [
    {
        id: '992812',
        name: 'Carlos Mendoza',
        email: 'carlos.m@beast.office',
        avatar: 'https://picsum.photos/seed/carlos/200',
        role: 'user',
        balance: 0,
        pendingBalance: 0,
        createdAt: new Date().toISOString(),
        rank: UserRank.MANAGER,
        status: UserStatus.ACTIVE,
        referralCode: 'REF-992812',
        personalVolume: 150,
        groupVolume: 45230,
        directActiveCount: 12,
        kycVerified: true,
        walletRegistered: true,
        commissionBalance: { tokens: 1400.50, btc: 600.21 },
        levels: { direct: 12, indirect: 45, deep: 128 },
        children: [
            {
                id: '110022',
                name: 'Sarah Connor',
                email: 'sarah.c@beast.office',
                avatar: 'https://picsum.photos/seed/sarah/200',
                role: 'user',
                balance: 0,
                pendingBalance: 0,
                createdAt: new Date().toISOString(),
                rank: UserRank.SOCIO,
                status: UserStatus.ACTIVE,
                sponsorId: '992812',
                sponsorName: 'Carlos Mendoza',
                referralCode: 'REF-110022',
                personalVolume: 60,
                groupVolume: 5200,
                directActiveCount: 6,
                kycVerified: true,
                walletRegistered: true,
                commissionBalance: { tokens: 420, btc: 180 },
                levels: { direct: 12, indirect: 8, deep: 4 },
                children: [
                    {
                        id: '221133',
                        name: 'Mike Ross',
                        email: 'mike.r@beast.office',
                        avatar: 'https://picsum.photos/seed/mike/200',
                        role: 'user',
                        balance: 0,
                        pendingBalance: 0,
                        createdAt: new Date().toISOString(),
                        rank: UserRank.AGENTE,
                        status: UserStatus.ACTIVE,
                        sponsorId: '110022',
                        sponsorName: 'Sarah Connor',
                        referralCode: 'REF-221133',
                        personalVolume: 50,
                        groupVolume: 150,
                        directActiveCount: 3,
                        kycVerified: true,
                        walletRegistered: true,
                        commissionBalance: { tokens: 70, btc: 30 },
                        levels: { direct: 3, indirect: 0, deep: 0 }
                    }
                ]
            }
        ]
    }
];

export const getAllUsers = (users: User[]): User[] => {
    let list: User[] = [];
    users.forEach(u => {
        list.push(u);
        if (u.children) {
            list = [...list, ...getAllUsers(u.children)];
        }
    });
    return list;
};

export const FLATTENED_USERS = getAllUsers(MOCK_USERS);

// Generador de transacciones falsas para la demo
export const generateMockTransactions = (count: number): Transaction[] => {
    const transactions: Transaction[] = [];
    const types = ['Commission', 'Commission', 'Commission', 'Bonus'];

    for (let i = 0; i < count; i++) {
        const isLevel1 = Math.random() > 0.5;
        const amount = isLevel1 ? 5.00 : (Math.random() > 0.5 ? 2.00 : 1.00); // 5%, 2% or 1% logic simulated
        const level = isLevel1 ? 1 : (amount === 2.00 ? 2 : 3);

        transactions.push({
            id: `TX-${Math.floor(Math.random() * 1000000)}`,
            userId: `USR-${Math.floor(Math.random() * 9999)}`,
            userName: `Referido Nivel ${level}`,
            amount: 100, // Base amount example
            date: new Date(Date.now() - (i * 3600000 * (Math.random() * 10))).toISOString(), // Random times in past
            level: level,
            commissionEarned: amount
        });
    }
    return transactions;
};

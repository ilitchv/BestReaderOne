
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { localDbService } from '../services/localDbService';
import { User, TicketData } from '../types';

interface ReferralNode {
    id: string;
    name: string;
    level: number;
    sales: number;
    role: string;
    children?: ReferralNode[];
}

const TreeNode: React.FC<{ node: ReferralNode }> = ({ node }) => {
    const hasChildren = node.children && node.children.length > 0;
    
    // Color coding by level
    const colors = [
        'border-neon-cyan bg-neon-cyan/20 text-white', // Root (User or Company)
        'border-blue-500 bg-blue-500/10 text-blue-200', // L1
        'border-purple-500 bg-purple-500/10 text-purple-200', // L2
        'border-pink-500 bg-pink-500/10 text-pink-200', // L3
    ];

    const isCompanyRoot = node.id === 'COMPANY_ROOT';
    const cardClass = `
        flex flex-col items-center p-3 rounded-xl border-2 shadow-lg transition-transform hover:scale-105
        ${isCompanyRoot ? 'border-amber-500 bg-amber-500/20 text-amber-100' : colors[Math.min(node.level, 3)]}
        min-w-[120px] relative z-10 bg-slate-900
    `;

    return (
        <div className="flex flex-col items-center">
            <div className={cardClass}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 border ${isCompanyRoot ? 'bg-amber-500 text-black border-amber-300' : 'bg-white/10 border-white/20'}`}>
                    {isCompanyRoot ? 'HQ' : node.name.charAt(0)}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">{node.name}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-70 mb-1">{node.role}</span>
                <span className="text-[10px] font-mono font-bold text-green-400 bg-black/40 px-2 py-0.5 rounded">
                    ${node.sales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            </div>
            
            {hasChildren && (
                <>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <div className="flex gap-4 relative">
                        {/* Connector Line Logic for multiple children */}
                        {node.children!.length > 1 && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gray-600 -translate-y-px" style={{ width: 'calc(100% - 120px)' }}></div>
                        )}
                        {node.children!.map((child) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Vertical connector to child */}
                                <div className="w-px h-6 bg-gray-600 absolute -top-6"></div>
                                <TreeNode node={child} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

interface ReferralTreeProps {
    rootUserId?: string; // Optional: Allow forcing a different root (for admin view)
    key?: number; // Force re-render
}

const ReferralTree: React.FC<ReferralTreeProps> = ({ rootUserId }) => {
    const { user } = useAuth();
    const [treeData, setTreeData] = useState<ReferralNode | null>(null);

    useEffect(() => {
        const buildTree = () => {
            const allUsers = localDbService.getUsers();
            const allTickets = localDbService.getTickets();

            // 1. Calculate Sales per User Map
            const salesMap: Record<string, number> = {};
            allTickets.forEach(t => {
                if (t.userId) {
                    salesMap[t.userId] = (salesMap[t.userId] || 0) + t.grandTotal;
                }
            });

            // Recursive Build Function
            const buildNode = (userId: string, currentLevel: number): ReferralNode | null => {
                const u = allUsers.find(user => user.id === userId);
                if (!u) return null;

                const directReferrals = allUsers.filter(user => user.sponsorId === userId);
                
                const children = directReferrals
                    .map(child => buildNode(child.id, currentLevel + 1))
                    .filter(node => node !== null) as ReferralNode[];

                return {
                    id: u.id,
                    name: u.name,
                    level: currentLevel,
                    role: u.role,
                    sales: salesMap[u.id] || 0,
                    children: children.length > 0 ? children : undefined
                };
            };

            // --- ADMIN GLOBAL VIEW LOGIC ---
            if (rootUserId === 'COMPANY_ROOT') {
                // Find all users who DO NOT have a sponsor (Orphans)
                // These are the top-level nodes of distinct trees
                const orphans = allUsers.filter(u => !u.sponsorId);
                
                const children = orphans
                    .map(u => buildNode(u.id, 1))
                    .filter(n => n !== null) as ReferralNode[];

                // Calculate total company sales
                const totalSales = Object.values(salesMap).reduce((a, b) => a + b, 0);

                setTreeData({
                    id: 'COMPANY_ROOT',
                    name: 'Beast HQ',
                    level: 0,
                    sales: totalSales,
                    role: 'Global',
                    children: children.length > 0 ? children : undefined
                });
            } else {
                // --- STANDARD USER VIEW LOGIC ---
                const currentRootId = rootUserId || user?.id;
                if (currentRootId) {
                    const tree = buildNode(currentRootId, 0);
                    setTreeData(tree);
                }
            }
        };

        buildTree();
    }, [user, rootUserId]);

    if (!treeData) {
        return (
            <div className="w-full p-8 bg-[#0f1525] rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[300px] text-gray-500">
                <p className="animate-pulse">Loading Network...</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto p-8 bg-[#0f1525] rounded-2xl border border-white/5 flex justify-center min-h-[400px]">
            <TreeNode node={treeData} />
        </div>
    );
};

export default ReferralTree;

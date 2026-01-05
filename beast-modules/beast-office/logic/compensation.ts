// PASTE YOUR logic/compensation.ts CODE HERE

import { User, UserRank, UserStatus } from '../../../types';

/**
 * Calcula la distribución de una comisión siguiendo la regla 70/30
 */
export const calculateSplit = (totalAmount: number) => {
    return {
        tokens: totalAmount * 0.70,
        btc: totalAmount * 0.30
    };
};

/**
 * Valida si un usuario califica para un rango específico en la semana actual
 * Basado en la sección 4.2 del plan
 */
export const checkQualification = (user: User, directActiveCount: number, directLegsVolumes: number[] = []): UserRank => {
    // Requisitos Generales
    if (!user.kycVerified || !user.walletRegistered || user.personalVolume < 50) {
        return UserRank.NORMAL;
    }

    // Lógica de Manager
    // Requiere: 5 Directos Activos, 500 GV Total, y 2 Ramas con >= 150 GV cada una
    if (
        directActiveCount >= 5 &&
        user.groupVolume >= 500
    ) {
        // Regla de Ramas: Al menos 2 ramas con >= 150 GV
        const qualifiedLegs = directLegsVolumes.filter(vol => vol >= 150).length;
        if (qualifiedLegs >= 2) {
            return UserRank.MANAGER;
        }
    }

    // Lógica de Socio
    if (directActiveCount >= 5 && user.groupVolume >= 150) {
        return UserRank.SOCIO;
    }

    // Lógica de Agente
    if (directActiveCount >= 3) {
        return UserRank.AGENTE;
    }

    return UserRank.NORMAL;
};

/**
 * Calcula la comisión por una transacción individual (Máximo 8%)
 */
export const calculateTransactionCommissions = (vc: number) => {
    return {
        n1: vc * 0.05,
        n2: vc * 0.02,
        n3: vc * 0.01,
        total: vc * 0.08
    };
};

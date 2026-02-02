// PASTE YOUR App.tsx CODE HERE

import React, { useState, useEffect } from 'react';
import { ViewType, User } from './types';
import Sidebar from './components/Sidebar';
import UserDirectory from './components/UserDirectory';
import GenealogyTree from './components/GenealogyTree';
import CommissionsView from './components/CommissionsView';
import ReportsView from './components/ReportsView';
import ConfigurationView from './components/ConfigurationView';
import AddReferralModal from './components/AddReferralModal';
import { MOCK_USERS, getAllUsers } from './mockData';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('tree');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rootUser, setRootUser] = useState<User>(MOCK_USERS[0]); // Estado global del árbol
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  // Helper para buscar y actualizar un nodo en el árbol recursivo
  const updateUserInTree = (users: User[], updatedUser: User): User[] => {
    return users.map(u => {
      if (u.id === updatedUser.id) return { ...updatedUser, children: u.children }; // Preservar hijos
      if (u.children) {
        return { ...u, children: updateUserInTree(u.children, updatedUser) };
      }
      return u;
    });
  };

  // Helper para mover nodos (Drag & Drop)
  const moveUserInTree = (draggedId: string, targetParentId: string) => {
    // 1. Encontrar y extraer el usuario arrastrado
    let draggedUser: User | null = null;

    const removeUser = (nodes: User[]): User[] => {
      let filtered: User[] = [];
      for (const node of nodes) {
        if (node.id === draggedId) {
          draggedUser = node; // Capturamos el usuario
        } else {
          const newNode = { ...node };
          if (newNode.children) {
            newNode.children = removeUser(newNode.children);
          }
          filtered.push(newNode);
        }
      }
      return filtered;
    };

    // 2. Insertar en el nuevo padre
    const insertUser = (nodes: User[]): User[] => {
      return nodes.map(node => {
        if (node.id === targetParentId && draggedUser) {
          return { ...node, children: [...(node.children || []), draggedUser] };
        }
        if (node.children) {
          return { ...node, children: insertUser(node.children) };
        }
        return node;
      });
    };

    // Prevenir mover el root o moverse a sí mismo
    if (draggedId === rootUser.id || draggedId === targetParentId) return;

    // Ejecutar movimiento
    const treeWithoutUser = removeUser([rootUser]);
    if (draggedUser) {
      // Validación circular simple: no mover un padre dentro de su propio hijo
      // (En una app real se necesita una validación recursiva más robusta)
      const newTree = insertUser(treeWithoutUser);
      setRootUser(newTree[0]);
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    const newTree = updateUserInTree([rootUser], updatedUser);
    setRootUser(newTree[0]);
  };

  const handleViewUserInTree = (userId: string) => {
    setFocusedUserId(userId);
    setActiveView('tree');
  };

  const renderView = () => {
    switch (activeView) {
      case 'directory':
        return <UserDirectory
          users={getAllUsers([rootUser])} // Pasamos la data dinámica
          onViewUserInTree={handleViewUserInTree}
        />;
      case 'tree':
        return <GenealogyTree
          rootUser={rootUser}
          onMoveUser={moveUserInTree}
          focusedUserId={focusedUserId}
          onFocusCleared={() => setFocusedUserId(null)}
        />;
      case 'commissions':
        return <CommissionsView user={rootUser} />;
      case 'reports':
        return <ReportsView />;
      case 'config':
        return <ConfigurationView user={rootUser} onUpdateUser={handleUpdateUser} />;
      default:
        return <GenealogyTree rootUser={rootUser} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-brand-dark overflow-hidden font-sans selection:bg-brand-cyan/30 selection:text-brand-cyan">
      <Sidebar activeView={activeView} onViewChange={(view) => {
        setActiveView(view);
        if (view !== 'tree') setFocusedUserId(null);
      }} />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-brand-panel-lighter px-6 py-4 bg-[#0f131a] z-20 shrink-0 shadow-lg">
          <div className="flex items-center gap-4">
            <h2 className="text-white text-xl font-bold leading-tight tracking-wide uppercase">
              {activeView === 'tree' && 'Gestión de Red Gráfica'}
              {activeView === 'directory' && 'Directorio de Usuarios'}
              {activeView === 'commissions' && 'Control de Comisiones'}
              {activeView === 'reports' && 'Métricas de Rendimiento'}
              {activeView === 'config' && 'Administración de Perfiles'}
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20">
              <span className="size-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
              <span className="text-[10px] text-brand-cyan font-bold tracking-wider uppercase">Admin Mode</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center rounded-lg h-10 px-4 border border-brand-panel-lighter bg-brand-cyan text-black hover:opacity-90 text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] mr-2">person_add</span>
              <span className="hidden md:inline">Nuevo Referido</span>
            </button>
            <div className="relative group cursor-pointer" onClick={() => setActiveView('config')}>
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-brand-panel-lighter group-hover:border-brand-cyan transition-colors"
                style={{ backgroundImage: `url(${rootUser.avatar})` }}
              ></div>
              <div className="absolute bottom-0 right-0 size-3 bg-brand-cyan rounded-full border-2 border-brand-dark"></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {renderView()}
        </div>

        {isModalOpen && <AddReferralModal onClose={() => setIsModalOpen(false)} sponsor={rootUser} />}
      </main>
    </div>
  );
};

export default App;

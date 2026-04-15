import { useSelector } from 'react-redux';
import type { RootState } from '../store';

/**
 * Permission hook — checks if the current user has a specific permission.
 * 
 * Usage:
 *   const { can, canAny, isAdmin } = usePermission();
 *   can('orders', 'create')  → true if user has orders.create
 *   canAny('orders')          → true if user has ANY orders permission
 *   isAdmin                   → true if nivel <= 2
 */
export function usePermission() {
  const user = useSelector((state: RootState) => state.auth.user);

  /** Check if user has specific module+action permission */
  const can = (modulo: string, accion: 'read' | 'create' | 'update' | 'delete'): boolean => {
    if (!user) return false;
    if (user.nivel <= 2) return true; // Director/Gerente can do everything
    return user.permissions?.some(p => p.modulo === modulo && p.accion === accion) ?? false;
  };

  /** Check if user has ANY permission for a module */
  const canAny = (modulo: string): boolean => {
    if (!user) return false;
    if (user.nivel <= 2) return true;
    return user.permissions?.some(p => p.modulo === modulo) ?? false;
  };

  /** Check if user has read access to a module */
  const canRead = (modulo: string): boolean => can(modulo, 'read');

  /** Check if user can create in a module */
  const canCreate = (modulo: string): boolean => can(modulo, 'create');

  /** Check if user can update in a module */
  const canUpdate = (modulo: string): boolean => can(modulo, 'update');

  /** Check if user can delete in a module */
  const canDelete = (modulo: string): boolean => can(modulo, 'delete');

  const isAdmin = (user?.nivel ?? 99) <= 2;
  const isSupervisor = (user?.nivel ?? 99) <= 3;

  return { can, canAny, canRead, canCreate, canUpdate, canDelete, isAdmin, isSupervisor, user };
}

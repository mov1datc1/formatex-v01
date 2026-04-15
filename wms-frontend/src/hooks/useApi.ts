import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { api } from '../config/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ===== HOOKS =====
export function useAuthToken() {
  return useSelector((state: RootState) => state.auth.user?.token);
}

export function useApi<T>(key: string[], url: string, params?: Record<string, any>, enabled = true) {
  return useQuery<T>({
    queryKey: [...key, params],
    queryFn: async () => {
      const { data } = await api.get(url, { params });
      return data;
    },
    enabled,
  });
}

export function useMutationApi<T>(url: string, method: 'post' | 'put' | 'delete' = 'post') {
  const queryClient = useQueryClient();
  return useMutation<T, Error, any>({
    mutationFn: async (body: any) => {
      const { data } = await api[method](url, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

// ===== Types =====
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HU {
  id: string;
  codigo: string;
  metrajeOriginal: number;
  metrajeActual: number;
  tipoRollo: 'ENTERO' | 'RETAZO';
  estadoHu: string;
  generacion: number;
  fechaIngreso: string;
  sku: { id: string; codigo: string; nombre: string; color?: string; categoria?: string };
  ubicacion?: { id: string; codigo: string };
  parentHu?: { id: string; codigo: string };
}

export interface SKU {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  color?: string;
  metrajeEstandar: number;
  activo: boolean;
  supplier?: { id: string; nombre: string };
}

export interface Order {
  id: string;
  codigo: string;
  estado: string;
  prioridad: number;
  fechaPedido: string;
  fechaRequerida?: string;
  facturaRef?: string;
  requiereCorte: boolean;
  client: { nombre: string; codigo: string };
  lineas: OrderLine[];
  _count: { lineas: number };
}

export interface OrderLine {
  id: string;
  skuId: string;
  metrajeRequerido: number;
  metrajeSurtido: number;
  estado: string;
  assignments: any[];
}

export interface CutOperation {
  id: string;
  codigo: string;
  metrajeAntes: number;
  metrajeCortado: number;
  metrajeRestante: number;
  fechaCorte: string;
  huOrigen: { codigo: string; sku: { nombre: string; color?: string } };
  huRetazo?: { codigo: string; metrajeActual: number; ubicacion?: { codigo: string } };
  orderLine?: { order: { codigo: string } };
}

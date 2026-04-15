import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

type Tab = 'users' | 'roles';

const MODULOS = [
  'orders', 'availability', 'transit',
  'picking', 'cutting', 'packing', 'shipping', 'transfers',
  'reception', 'inventory',
  'warehouse', 'catalog', 'admin', 'alerts', 'fulfillment',
];
const ACCIONES = ['read', 'create', 'update', 'delete'];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [lastCreated, setLastCreated] = useState<{ nombre: string; username: string; password: string } | null>(null);

  const { data: usersResp } = useApi<PaginatedResponse<any>>(['admin-users', userSearch], '/admin/users', { search: userSearch || undefined, limit: 50 });
  const { data: roles } = useApi<any[]>(['admin-roles'], '/admin/roles');
  const { data: roleDetail } = useApi<any>(['role-detail', selectedRole], `/admin/roles/${selectedRole}`, {}, !!selectedRole);
  const createUserMut = useMutationApi('/admin/users');
  const createRoleMut = useMutationApi('/admin/roles');

  // User form
  const [userForm, setUserForm] = useState({ nombre: '', username: '', email: '', password: '', roleId: '' });
  const handleCreateUser = async () => {
    if (!userForm.nombre || !userForm.username || !userForm.password || !userForm.roleId) return toast.error('Completa campos obligatorios');
    try {
      await createUserMut.mutateAsync(userForm);
      toast.success('✅ Usuario creado');
      setLastCreated({ nombre: userForm.nombre, username: userForm.username, password: userForm.password });
      setShowUserForm(false);
      setUserForm({ nombre: '', username: '', email: '', password: '', roleId: '' });
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };

  // Role form
  const [roleForm, setRoleForm] = useState({ nombre: '', descripcion: '', nivel: 4, permissions: [] as { modulo: string; accion: string }[] });
  const togglePerm = (modulo: string, accion: string) => {
    const existing = roleForm.permissions.find((p) => p.modulo === modulo && p.accion === accion);
    if (existing) {
      setRoleForm({ ...roleForm, permissions: roleForm.permissions.filter((p) => !(p.modulo === modulo && p.accion === accion)) });
    } else {
      setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, { modulo, accion }] });
    }
  };
  const handleCreateRole = async () => {
    if (!roleForm.nombre) return toast.error('Nombre obligatorio');
    try { await createRoleMut.mutateAsync(roleForm); toast.success('✅ Rol creado'); setShowRoleForm(false); } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };

  const toggleUserActive = async (id: string, current: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { activo: !current });
      toast.success(current ? 'Usuario desactivado' : 'Usuario activado');
      window.location.reload();
    } catch { toast.error('Error'); }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId || newPassword.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    try {
      await api.put(`/admin/users/${resetPasswordUserId}/reset-password`, { password: newPassword });
      toast.success('✅ Contraseña actualizada');
      setResetPasswordUserId(null);
      setNewPassword('');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">Administración</h1><p className="text-gray-500 text-sm">Usuarios, roles y permisos</p></div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-xs">
        <button onClick={() => setTab('users')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>👤 Usuarios</button>
        <button onClick={() => setTab('roles')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'roles' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>🔐 Roles</button>
      </div>

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Buscar usuario..." className="px-4 py-2 bg-white border rounded-lg text-sm w-60" />
            <button onClick={() => setShowUserForm(!showUserForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">{showUserForm ? '✕ Cerrar' : '+ Nuevo Usuario'}</button>
          </div>

          {showUserForm && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold">Nuevo Usuario</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FI label="Nombre *" value={userForm.nombre} onChange={(v) => setUserForm({ ...userForm, nombre: v })} />
                <FI label="Username *" value={userForm.username} onChange={(v) => setUserForm({ ...userForm, username: v })} />
                <FI label="Email *" value={userForm.email} onChange={(v) => setUserForm({ ...userForm, email: v })} type="email" />
                <FI label="Contraseña *" value={userForm.password} onChange={(v) => setUserForm({ ...userForm, password: v })} type="password" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rol *</label>
                  <select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                    <option value="">Seleccionar...</option>
                    {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3"><button onClick={() => setShowUserForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button><button onClick={handleCreateUser} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Crear</button></div>
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="px-4 py-3 text-left">Nombre</th><th className="px-4 py-3 text-left">Username</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Rol</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {usersResp?.data?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{u.username}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{u.role?.nombre}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`inline-block w-2 h-2 rounded-full ${u.activo ? 'bg-emerald-400' : 'bg-red-400'}`}></span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setResetPasswordUserId(u.id); setNewPassword(''); }} className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50" title="Cambiar contraseña">
                          🔑
                        </button>
                        <button onClick={() => toggleUserActive(u.id, u.activo)} className={`text-xs px-2 py-1 rounded ${u.activo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Last created user credentials */}
          {lastCreated && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg">✅</span>
              <div className="flex-1">
                <p className="font-semibold text-emerald-800 text-sm">Usuario creado exitosamente</p>
                <div className="mt-2 bg-white rounded-lg p-3 font-mono text-sm border border-emerald-200">
                  <p><span className="text-gray-500">Nombre:</span> {lastCreated.nombre}</p>
                  <p><span className="text-gray-500">Usuario:</span> <span className="text-blue-600 font-semibold">{lastCreated.username}</span></p>
                  <p><span className="text-gray-500">Contraseña:</span> <span className="text-red-600 font-semibold">{lastCreated.password}</span></p>
                </div>
                <p className="text-xs text-emerald-600 mt-2">⚠️ Comparte estas credenciales al usuario. La contraseña no se puede recuperar después.</p>
              </div>
              <button onClick={() => setLastCreated(null)} className="text-emerald-400 hover:text-emerald-600 text-sm">✕</button>
            </div>
          )}

          {/* Password Reset Modal */}
          {resetPasswordUserId && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setResetPasswordUserId(null)}>
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-semibold text-lg flex items-center gap-2">🔑 Cambiar Contraseña</h2>
                <p className="text-sm text-gray-500">
                  Usuario: <span className="font-semibold text-gray-900">{usersResp?.data?.find((u: any) => u.id === resetPasswordUserId)?.nombre}</span>
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nueva Contraseña (mín. 6 caracteres)</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa la nueva contraseña"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setResetPasswordUserId(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button onClick={handleResetPassword} disabled={newPassword.length < 6} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ROLES TAB */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-end"><button onClick={() => setShowRoleForm(!showRoleForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">{showRoleForm ? '✕ Cerrar' : '+ Nuevo Rol'}</button></div>

            {showRoleForm && (
              <div className="bg-white rounded-xl border p-6 space-y-4">
                <h2 className="font-semibold">Nuevo Rol</h2>
                <div className="grid grid-cols-3 gap-4">
                  <FI label="Nombre *" value={roleForm.nombre} onChange={(v) => setRoleForm({ ...roleForm, nombre: v })} placeholder="PICKER" />
                  <FI label="Descripción" value={roleForm.descripcion} onChange={(v) => setRoleForm({ ...roleForm, descripcion: v })} />
                  <FI label="Nivel (1=Dir, 4=Op)" type="number" value={roleForm.nivel} onChange={(v) => setRoleForm({ ...roleForm, nivel: +v })} />
                </div>
                <div className="border-t pt-3">
                  <h3 className="text-sm font-semibold mb-2">Permisos ({roleForm.permissions.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr><th className="px-2 py-1 text-left">Módulo</th>{ACCIONES.map((a) => <th key={a} className="px-2 py-1 text-center">{a}</th>)}</tr></thead>
                      <tbody>
                        {MODULOS.map((m) => (
                          <tr key={m} className="border-t">
                            <td className="px-2 py-1 font-medium">{m}</td>
                            {ACCIONES.map((a) => (
                              <td key={a} className="px-2 py-1 text-center">
                                <input type="checkbox" checked={roleForm.permissions.some((p) => p.modulo === m && p.accion === a)} onChange={() => togglePerm(m, a)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end gap-3"><button onClick={() => setShowRoleForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button><button onClick={handleCreateRole} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Crear Rol</button></div>
              </div>
            )}

            <div className="space-y-2">
              {roles?.map((r: any) => (
                <div key={r.id} onClick={() => setSelectedRole(r.id)} className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${selectedRole === r.id ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔐</span>
                      <div><p className="font-semibold">{r.nombre}</p><p className="text-xs text-gray-400">{r._count?.users || 0} usuarios · {r.permissions?.length || 0} permisos</p></div>
                    </div>
                    <span className="text-xs text-gray-400">Nivel {r.nivel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role Detail */}
          <div className="bg-white rounded-xl border p-5">
            {!selectedRole ? (
              <div className="text-center text-gray-400 py-12"><p className="text-3xl mb-2">🔐</p><p className="text-sm">Selecciona un rol</p></div>
            ) : !roleDetail ? (
              <div className="text-center text-gray-400 py-12">Cargando...</div>
            ) : (
              <RoleDetailPanel roleDetail={roleDetail} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleDetailPanel({ roleDetail }: { roleDetail: any }) {
  const [editMode, setEditMode] = useState(false);
  const [editPerms, setEditPerms] = useState<{ modulo: string; accion: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditPerms(roleDetail.permissions?.map((p: any) => ({ modulo: p.modulo, accion: p.accion })) || []);
    setEditMode(true);
  };

  const toggleEditPerm = (modulo: string, accion: string) => {
    const exists = editPerms.find((p) => p.modulo === modulo && p.accion === accion);
    if (exists) {
      setEditPerms(editPerms.filter((p) => !(p.modulo === modulo && p.accion === accion)));
    } else {
      setEditPerms([...editPerms, { modulo, accion }]);
    }
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/roles/${roleDetail.id}/permissions`, { permissions: editPerms });
      toast.success('✅ Permisos actualizados. Los usuarios con este rol deben re-iniciar sesión para aplicar los cambios.', { duration: 5000 });
      setEditMode(false);
      window.location.reload();
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{roleDetail.nombre}</h3>
        {!editMode ? (
          <button onClick={startEdit} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200">Editar Permisos</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditMode(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">Cancelar</button>
            <button onClick={savePermissions} disabled={saving} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">{saving ? 'Guardando...' : '💾 Guardar'}</button>
          </div>
        )}
      </div>
      {roleDetail.descripcion && <p className="text-sm text-gray-500">{roleDetail.descripcion}</p>}

      {editMode ? (
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Editar Permisos ({editPerms.length} seleccionados)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr><th className="px-1 py-1 text-left text-[10px]">Módulo</th>{ACCIONES.map((a) => <th key={a} className="px-1 py-1 text-center text-[10px]">{a}</th>)}</tr></thead>
              <tbody>
                {MODULOS.map((m) => (
                  <tr key={m} className="border-t">
                    <td className="px-1 py-1 font-medium text-[11px]">{m}</td>
                    {ACCIONES.map((a) => (
                      <td key={a} className="px-1 py-1 text-center">
                        <input type="checkbox" checked={editPerms.some((p) => p.modulo === m && p.accion === a)} onChange={() => toggleEditPerm(m, a)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Permisos ({roleDetail.permissions?.length})</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {roleDetail.permissions?.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-1.5 bg-gray-50 rounded text-xs">
                <span className="font-medium">{p.modulo}</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{p.accion}</span>
              </div>
            ))}
            {(!roleDetail.permissions || roleDetail.permissions.length === 0) && <p className="text-gray-400 text-xs py-4 text-center">Sin permisos</p>}
          </div>
        </div>
      )}

      <div className="border-t pt-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Usuarios ({roleDetail.users?.length})</h4>
        <div className="space-y-1">
          {roleDetail.users?.map((u: any) => (
            <div key={u.id} className="flex justify-between items-center p-1.5 bg-gray-50 rounded text-xs">
              <span>{u.nombre}</span>
              <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            </div>
          ))}
          {(!roleDetail.users || roleDetail.users.length === 0) && <p className="text-gray-400 text-xs py-2 text-center">Sin usuarios</p>}
        </div>
      </div>
    </div>
  );
}

function FI({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (<div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" /></div>);
}

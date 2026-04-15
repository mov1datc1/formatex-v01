import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../../config/api';
import { loginSuccess } from '../../store/slices/authSlice';

interface LoginForm {
  username: string;
  password: string;
}

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      const { token, user } = response.data;
      dispatch(loginSuccess({ ...user, token }));
      toast.success(`¡Bienvenido, ${user.nombre}!`);
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl mb-4 border border-white/20">
            <span className="text-2xl font-extrabold text-white">360</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            WMS 360<span className="text-primary-300">+</span>
          </h1>
          <p className="text-white/60 mt-1 text-sm">Formatex — Sistema de Gestión de Almacén</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Usuario o Email</label>
              <input
                type="text"
                placeholder="admin"
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all ${
                  errors.username ? 'border-red-400' : 'border-white/20'
                }`}
                {...register('username', { required: 'Usuario requerido' })}
              />
              {errors.username && (
                <p className="text-red-300 text-xs mt-1">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all ${
                    errors.password ? 'border-red-400' : 'border-white/20'
                  }`}
                  {...register('password', { required: 'Contraseña requerida' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-300 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 hover:shadow-primary-400/40"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          © 2026 Movida TCI — WMS 360+ v2.0
        </p>
      </div>
    </div>
  );
};

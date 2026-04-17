import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Warehouse, BarChart3, Truck, ScanLine } from 'lucide-react';
import { api } from '../../config/api';
import { loginSuccess } from '../../store/slices/authSlice';

interface LoginForm {
  username: string;
  password: string;
}

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Where to redirect after login (supports /zebra PWA flow)
  const from = (location.state as any)?.from || '/';

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
      navigate(from);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Warehouse, label: 'Inventario HU-Céntrico', desc: 'Trazabilidad total por rollo' },
    { icon: ScanLine, label: 'PWA Zebra TC22', desc: 'Picking y corte móvil' },
    { icon: BarChart3, label: 'Dashboard en Vivo', desc: 'KPIs en tiempo real' },
    { icon: Truck, label: 'Tránsito Inteligente', desc: 'Visibilidad de embarques' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #0d1b3e 30%, #0f2044 60%, #081428 100%)' }}>
      {/* ===== ANIMATED BACKGROUND ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animation: 'pulse 8s ease-in-out infinite' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', animation: 'pulse 10s ease-in-out infinite reverse' }} />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite 2s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        {/* Animated particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/10"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `-${Math.random() * 10}s`,
            }} />
        ))}
      </div>

      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-16 xl:px-24">
        <div style={{ animation: 'slideInLeft 0.8s ease-out' }}>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            <img src="/logo-360.png" alt="WMS 360+" className="w-16 h-16 drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.4))' }} />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                WMS 360<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">+</span>
              </h1>
              <p className="text-white/40 text-sm font-medium tracking-wide">FORMATEX · GESTIÓN DE ALMACÉN</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
            Control total de
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              tu inventario
            </span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-md leading-relaxed">
            Plataforma integral para gestión de almacén textil con trazabilidad por rollo, corte inteligente y sincronización ERP.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feat, idx) => (
              <div key={idx}
                className="group flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300"
                style={{ animation: `fadeInUp 0.6s ease-out ${0.2 + idx * 0.1}s both` }}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feat.icon size={18} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-semibold">{feat.label}</p>
                  <p className="text-white/35 text-xs">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company info */}
        <div className="absolute bottom-10 left-16 xl:left-24">
          <p className="text-white/20 text-xs">FORMA TEXTIL S. DE R.L. DE C.V.</p>
          <p className="text-white/15 text-xs">Río La Barca No. 1680, Guadalajara, Jalisco</p>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Login Form ===== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md" style={{ animation: 'slideInRight 0.8s ease-out' }}>
          
          {/* Mobile logo (hidden on desktop) */}
          <div className="flex lg:hidden flex-col items-center mb-10">
            <img src="/logo-360.png" alt="WMS 360+" className="w-20 h-20 mb-4 drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 25px rgba(59,130,246,0.5))' }} />
            <h1 className="text-3xl font-black text-white tracking-tight">
              WMS 360<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">+</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Formatex · Gestión de Almacén</p>
          </div>

          {/* Glass Card */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-indigo-500/20 rounded-3xl blur-xl opacity-60" />
            
            <div className="relative rounded-2xl border border-white/[0.08] p-8 sm:p-10"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(40px)' }}>
              
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">Iniciar Sesión</h2>
                <p className="text-white/40 text-sm">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Usuario o Email</label>
                  <input
                    type="text"
                    placeholder="ej. admin"
                    autoComplete="username"
                    className={`w-full px-4 py-3.5 rounded-xl text-white placeholder-white/25 text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 ${
                      errors.username
                        ? 'border-red-400/60 bg-red-500/5'
                        : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]'
                    } border`}
                    {...register('username', { required: 'Usuario requerido' })}
                  />
                  {errors.username && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`w-full px-4 py-3.5 pr-12 rounded-xl text-white placeholder-white/25 text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 ${
                        errors.password
                          ? 'border-red-400/60 bg-red-500/5'
                          : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]'
                      } border`}
                      {...register('password', { required: 'Contraseña requerida' })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #3b82f6 100%)', backgroundSize: '200% auto' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundPosition = 'right center')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundPosition = 'left center')}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)', animation: 'shine 2s ease-in-out infinite' }} />
                  
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Ingresando...
                      </>
                    ) : (
                      'Ingresar al Sistema'
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-white/20 text-xs font-medium">SISTEMA OPERATIVO</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Quick access info */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { n: '31', label: 'HUs', color: 'from-blue-500/20 to-blue-600/20' },
                  { n: '5', label: 'Pedidos', color: 'from-emerald-500/20 to-emerald-600/20' },
                  { n: '9', label: 'Usuarios', color: 'from-purple-500/20 to-purple-600/20' },
                ].map((stat, i) => (
                  <div key={i} className={`text-center py-3 rounded-xl bg-gradient-to-br ${stat.color} border border-white/[0.04]`}>
                    <p className="text-white font-bold text-lg">{stat.n}</p>
                    <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/15 text-xs mt-8 tracking-wide">
            © 2026 Movida TCI — WMS 360+ v2.0 · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* ===== CSS ANIMATIONS ===== */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

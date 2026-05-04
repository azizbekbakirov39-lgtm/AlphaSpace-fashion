import React from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User as UserIcon,
  Shirt,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { translations, Language } from '../../translations';
import { User } from '../../types';

interface AuthSectionProps {
  isLogin: boolean;
  setIsLogin: (val: boolean) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  displayName: string;
  setDisplayName: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  authLoading: boolean;
  handleAuth: (e: React.FormEvent) => void;
  language: Language;
}

const AuthSection: React.FC<AuthSectionProps> = ({
  isLogin,
  setIsLogin,
  email,
  setEmail,
  password,
  setPassword,
  displayName,
  setDisplayName,
  showPassword,
  setShowPassword,
  authLoading,
  handleAuth,
  language
}) => {
  const t = translations[language];

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-accent-blue to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-accent-blue/20 rotate-12">
            <Shirt size={32} />
          </div>
          <h1 className="text-3xl font-black text-text-primary uppercase tracking-tighter italic">Vibe App</h1>
          <p className="text-sm font-medium text-text-primary/60 mt-2">
            {isLogin ? "Dunyodagi eng yaxshi kiyimlar olami" : "Style hamjamiyatimizga qo'shiling"}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-primary/30 group-focus-within:text-accent-blue transition-colors">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  placeholder={language === 'uz' ? "Ismingiz" : "Ваше имя"}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-text-primary/5 border border-border-primary rounded-2xl outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all font-medium text-sm"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-primary/30 group-focus-within:text-accent-blue transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder={t.email_placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-text-primary/5 border border-border-primary rounded-2xl outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all font-medium text-sm"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-primary/30 group-focus-within:text-accent-blue transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.password_placeholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-text-primary/5 border border-border-primary rounded-2xl outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all font-medium text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-primary/30 hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-text-primary text-bg-primary font-black uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group shadow-xl shadow-text-primary/10"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? t.login_button : t.register_title}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-text-primary/60 hover:text-accent-blue transition-colors"
            >
              {isLogin ? (language === 'uz' ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting" : "Нет аккаунта? Зарегистрируйтесь") : (language === 'uz' ? "Hisobingiz bormi? Kirish" : "Есть аккаунт? Войдите")}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="p-8 text-center">
        <p className="text-[10px] font-bold text-text-primary/30 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Sparkles size={10} /> Powered by Vibe AI <Sparkles size={10} />
        </p>
      </div>
    </div>
  );
};

export default AuthSection;

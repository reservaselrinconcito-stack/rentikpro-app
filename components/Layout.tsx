
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Building2, CalendarRange, Wallet, Globe, RefreshCw, Landmark, ScanFace, MessageSquare, Database, Save, XCircle, Activity, Sparkles, ExternalLink, ShieldAlert, Megaphone, Settings, Menu, X
} from 'lucide-react';
import { projectManager } from '../services/projectManager';

interface LayoutProps {
  children: React.ReactNode;
  onSave: () => void;
  onClose: () => void;
}

const NavItem = ({ to, icon: Icon, label, external, onClick }: { to: string; icon: any; label: string; external?: boolean; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  if (external) {
    return (
      <a href={to} className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 group">
        <Icon size={18} className="text-slate-400 group-hover:text-indigo-500" />
        <span className="text-sm flex-1">{label}</span>
        <ExternalLink size={12} className="opacity-50" />
      </a>
    );
  }

  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-semibold translate-x-1' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}>
      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
      <span className="text-sm">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, onSave, onClose }) => {
  const projectName = projectManager.getProjectName();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/calendar" icon={Calendar} label="Calendario" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/channel-manager" icon={RefreshCw} label="Channel Manager" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/comms" icon={MessageSquare} label="Buzón Unificado" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/properties" icon={Building2} label="Propiedades" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/bookings" icon={CalendarRange} label="Reservas" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/travelers" icon={Users} label="Viajeros" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/checkin-scan" icon={ScanFace} label="Check-in Scan" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/marketing" icon={Megaphone} label="Marketing" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/accounting" icon={Wallet} label="Contabilidad" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/registry" icon={Landmark} label="Registro / Ventanilla" onClick={mobile ? handleNavClick : undefined} />

      <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Create2Web</div>
      <NavItem to="/website-builder" icon={Globe} label="Mis Sitios" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/prompt-builder" icon={Sparkles} label="Prompt Builder" onClick={mobile ? handleNavClick : undefined} />

      <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Herramientas</div>
      <NavItem to="/importers" icon={ShieldAlert} label="Importadores" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/qa" icon={Activity} label="Calidad / Tests" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/settings" icon={Settings} label="Configuración" onClick={mobile ? handleNavClick : undefined} />

      <div className="pt-4 pb-2 px-2">
        <a href="/apps/channel_manager.html" target="_blank" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">
          <ExternalLink size={10} /> Abrir Visor Standalone
        </a>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:text-indigo-600">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 text-indigo-600">
          <div className="bg-indigo-600 p-1 rounded-lg text-white"><Building2 size={20} /></div>
          <span className="text-lg font-black">RentikPro</span>
        </div>
        <button onClick={onSave} className="p-2 -mr-2 text-slate-600 hover:text-indigo-600">
          <Save size={20} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex-col select-none hidden md:flex">
          <div className="p-6">
            <div className="flex items-center gap-3 text-indigo-600 mb-8">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Building2 size={24} /></div>
              <span className="text-xl font-black tracking-tight">RentikPro</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Database size={16} /></div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">PROYECTO</p>
                <p className="text-xs font-bold text-slate-700 truncate">{projectName}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            <NavContent />
          </nav>
          <div className="p-4 bg-slate-100/50 border-t border-slate-200 space-y-2">
            <button onClick={onSave} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-xs shadow-sm"><Save size={16} />Guardar</button>
            <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"><XCircle size={14} />Cerrar</button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-50 z-50 flex flex-col md:hidden shadow-2xl">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 text-indigo-600">
                    <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Building2 size={24} /></div>
                    <span className="text-xl font-black tracking-tight">RentikPro</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Database size={16} /></div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">PROYECTO</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{projectName}</p>
                  </div>
                </div>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                <NavContent mobile={true} />
              </nav>
              <div className="p-4 bg-slate-100/50 border-t border-slate-200 space-y-2">
                <button onClick={() => { onSave(); setMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-xs shadow-sm"><Save size={16} />Guardar</button>
                <button onClick={() => { onClose(); setMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"><XCircle size={14} />Cerrar</button>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-white relative flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar md:p-6 p-4">{children}</div>
        </main>
      </div>
    </div>
  );
};

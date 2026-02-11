
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, CalendarRange, Users, Wallet, Settings, Save, XCircle, Database, FileDigit, ShieldAlert, Calendar, Megaphone, ScanFace, Landmark, Globe, MessageSquare, RefreshCw, Activity, ExternalLink, Sparkles
} from 'lucide-react';
import { projectManager } from '../services/projectManager';

interface LayoutProps {
  children: React.ReactNode;
  onSave: () => void;
  onClose: () => void;
}

const NavItem = ({ to, icon: Icon, label, external }: { to: string; icon: any; label: string; external?: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  if (external) {
    return (
      <a href={to} className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 group">
        <Icon size={18} className="text-slate-400 group-hover:text-indigo-500" />
        <span className="text-sm flex-1">{label}</span>
        <ExternalLink size={12} className="opacity-50"/>
      </a>
    );
  }

  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-semibold translate-x-1' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}>
      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
      <span className="text-sm">{label}</span>
    </Link>
  );
};

export const Layout: React.FC = ({ children, onSave, onClose }) => {
  const projectName = projectManager.getProjectName();
  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col select-none hidden md:flex">
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
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/calendar" icon={Calendar} label="Calendario" />
          <NavItem to="/channel-manager" icon={RefreshCw} label="Channel Manager" />
          <NavItem to="/comms" icon={MessageSquare} label="Buzón Unificado" />
          <NavItem to="/properties" icon={Building2} label="Propiedades" />
          <NavItem to="/bookings" icon={CalendarRange} label="Reservas" />
          <NavItem to="/travelers" icon={Users} label="Viajeros" />
          <NavItem to="/checkin-scan" icon={ScanFace} label="Check-in Scan" />
          <NavItem to="/marketing" icon={Megaphone} label="Marketing" />
          <NavItem to="/accounting" icon={Wallet} label="Contabilidad" />
          <NavItem to="/registry" icon={Landmark} label="Registro / Ventanilla" />
          
          <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Create2Web</div>
          <NavItem to="/website-builder" icon={Globe} label="Mis Sitios" />
          <NavItem to="/prompt-builder" icon={Sparkles} label="Prompt Builder" />
          
          <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Herramientas</div>
          <NavItem to="/importers" icon={ShieldAlert} label="Importadores" />
          <NavItem to="/qa" icon={Activity} label="Calidad / Tests" />
          
          <div className="pt-4 pb-2 px-2">
             <a href="/apps/channel_manager.html" target="_blank" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                <ExternalLink size={10}/> Abrir Visor Standalone
             </a>
          </div>
        </nav>
        <div className="p-4 bg-slate-100/50 border-t border-slate-200 space-y-2">
          <button onClick={onSave} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-xs shadow-sm"><Save size={16} />Guardar</button>
          <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"><XCircle size={14} />Cerrar</button>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden bg-white relative flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar md:p-6 p-0">{children}</div>
      </main>
    </div>
  );
};

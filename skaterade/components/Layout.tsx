import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { HomeIcon, SearchIcon, PlusSquareIcon, UserIcon, TrophyIcon } from './Icons';

export const Layout: React.FC = () => {
  const navItems = [
    { to: "/", icon: HomeIcon, label: "Feed" },
    { to: "/challenges", icon: TrophyIcon, label: "Battles" },
    { to: "/editor", icon: PlusSquareIcon, label: "Create", highlight: true },
    { to: "/search", icon: SearchIcon, label: "Discover" },
    { to: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="pb-20 md:pb-0 md:pl-20 min-h-screen">
        <Outlet />
      </main>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center border-r border-slate-200 bg-white py-8 z-50 shadow-sm">
         <div className="mb-8 font-display font-bold text-2xl text-blue-600 italic tracking-tighter">SK</div>
         <div className="flex flex-col space-y-8 w-full items-center">
            {navItems.map((item) => (
              <NavLink 
                key={item.to} 
                to={item.to}
                className={({ isActive }) => `p-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <item.icon className="w-6 h-6" />
                <span className="sr-only">{item.label}</span>
              </NavLink>
            ))}
         </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 px-6 py-4 pb-6 safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center">
          {navItems.map((item) => (
            <NavLink 
              key={item.to} 
              to={item.to}
              className={({ isActive }) => `flex flex-col items-center justify-center transition-colors ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-400 hover:text-slate-600'
              } ${item.highlight ? 'text-white' : ''}`}
            >
               {item.highlight ? (
                 <div className="bg-blue-600 text-white p-3 rounded-xl -mt-6 shadow-lg shadow-blue-600/30 ring-4 ring-white">
                    <item.icon className="w-6 h-6" />
                 </div>
               ) : (
                 <item.icon className="w-6 h-6" />
               )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
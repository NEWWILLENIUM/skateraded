import React from 'react';
import { SettingsIcon, TrophyIcon } from '../components/Icons';

export const Profile: React.FC = () => {
  const mockClips = [1,2,3,4,5,6];
  
  // Mock badges for the user
  const badges = ["SOTW Winner", "Gap Master"];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pb-24">
       <div className="flex flex-col md:flex-row md:items-start md:space-x-8 mb-12">
          {/* Avatar */}
          <div className="flex justify-center mb-6 md:mb-0">
             <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-600 to-blue-300 p-1 shadow-lg shadow-blue-600/20">
                <img 
                  src="https://picsum.photos/200/200?random=10" 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover border-4 border-white"
                />
             </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start space-x-4 mb-4">
                <h2 className="text-2xl font-bold text-slate-900">skater_boi_2000</h2>
                <button className="p-2 text-slate-400 hover:text-slate-900 border border-slate-200 bg-white hover:border-slate-300 rounded-lg transition-colors shadow-sm">
                   <SettingsIcon className="w-5 h-5" />
                </button>
             </div>
             
             <div className="flex justify-center md:justify-start space-x-8 mb-6 text-sm">
                <div className="text-center md:text-left">
                   <span className="font-bold text-slate-900 block text-lg">42</span>
                   <span className="text-slate-500">Clips</span>
                </div>
                <div className="text-center md:text-left">
                   <span className="font-bold text-slate-900 block text-lg">1.2k</span>
                   <span className="text-slate-500">Followers</span>
                </div>
                <div className="text-center md:text-left">
                   <span className="font-bold text-slate-900 block text-lg">340</span>
                   <span className="text-slate-500">Following</span>
                </div>
             </div>

             <div className="mb-6">
                <p className="text-slate-600 text-sm max-w-md mx-auto md:mx-0">
                    Filming on VX1000 & iPhone 13.
                    <br/>Locals only. Bay Area 🌉
                    <br/>Sponsor me @element
                </p>
             </div>

             {/* Badges Section */}
             {badges.length > 0 && (
                 <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                     {badges.map((badge, idx) => (
                         <div key={idx} className="flex items-center space-x-1 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-xs text-blue-600 font-bold uppercase tracking-wider">
                             <TrophyIcon className="w-3 h-3" />
                             <span>{badge}</span>
                         </div>
                     ))}
                 </div>
             )}
          </div>
       </div>

       {/* Tabs */}
       <div className="border-b border-slate-200 flex justify-center space-x-12 mb-6">
          <button className="pb-4 border-b-2 border-blue-600 text-slate-900 font-bold tracking-wide">CLIPS</button>
          <button className="pb-4 border-b-2 border-transparent text-slate-400 hover:text-slate-600 font-bold tracking-wide">SAVED</button>
          <button className="pb-4 border-b-2 border-transparent text-slate-400 hover:text-slate-600 font-bold tracking-wide">TAGGED</button>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-3 gap-1 md:gap-4">
          {mockClips.map((i) => (
             <div key={i} className="aspect-square bg-slate-100 overflow-hidden relative group cursor-pointer rounded-sm md:rounded-lg">
                <img 
                   src={`https://picsum.photos/400/400?random=${i + 20}`} 
                   className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                   alt="Clip thumbnail"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
             </div>
          ))}
       </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Challenge, ChallengeEntry } from '../types';
import { FireIcon, TrophyIcon, PlusSquareIcon, CheckIcon, SettingsIcon } from '../components/Icons';

const MOCK_ACTIVE_CHALLENGE: Challenge = {
  id: 'c1',
  title: 'Best Tre-Flip Stair Set',
  description: 'Cleanest 360 Flip down a 5-stair or bigger. No hands touching!',
  endDate: '2 days left',
  isActive: true,
  prize: 'Golden Deck Badge'
};

const MOCK_PAST_CHALLENGES: Challenge[] = [
  {
    id: 'c2',
    title: 'Longest Manual',
    description: 'Balance is key. Who can hold it the longest?',
    endDate: 'Ended 1 week ago',
    isActive: false,
    prize: 'Balance Master Badge',
    winner: {
        id: 'u5',
        username: 'manual_god',
        avatarUrl: 'https://picsum.photos/100/100?random=50',
        followers: 800,
        following: 100
    }
  },
  {
    id: 'c3',
    title: 'Slappy Curb Session',
    description: 'Style over difficulty. Best slappy combo.',
    endDate: 'Ended 2 weeks ago',
    isActive: false,
    prize: 'Curb Crusher Badge',
    winner: {
        id: 'u6',
        username: 'curb_killer',
        avatarUrl: 'https://picsum.photos/100/100?random=51',
        followers: 1200,
        following: 50
    }
  }
];

const INITIAL_ENTRIES: ChallengeEntry[] = [
  {
    id: 'e1',
    challengeId: 'c1',
    user: {
      id: 'u2',
      username: 'night_rider',
      avatarUrl: 'https://picsum.photos/100/100?random=2',
      followers: 450,
      following: 120,
    },
    videoUrl: 'https://media.istockphoto.com/id/1152063319/video/skateboarder-doing-an-ollie-in-slow-motion.mp4?s=mp4-640x640-is&k=20&c=wR04d6H3dPU-7v0-IBrvNnJt-bS4EwbYvV7xQk7Lh-8=',
    votes: 45
  },
  {
    id: 'e2',
    challengeId: 'c1',
    user: {
      id: 'u3',
      username: 'skate_or_die',
      avatarUrl: 'https://picsum.photos/100/100?random=3',
      followers: 200,
      following: 200,
    },
    videoUrl: 'https://media.istockphoto.com/id/1181822363/video/teenager-skating-at-the-skate-park.mp4?s=mp4-640x640-is&k=20&c=hC7O9yB1yE5gX_v5q5sO6l6J5_j5h2_y4q4w4_5u5_8=',
    votes: 32
  },
  {
    id: 'e3',
    challengeId: 'c1',
    user: {
      id: 'u4',
      username: 'vert_king',
      avatarUrl: 'https://picsum.photos/100/100?random=4',
      followers: 150,
      following: 10,
    },
    videoUrl: 'https://media.istockphoto.com/id/1320392063/video/skateboarder-performing-kickflip-trick.mp4?s=mp4-640x640-is&k=20&c=CR9_aD0kXkK8J_Qk_z8k_z8k_z8k_z8k_z8k_z8k_z8=',
    votes: 89
  }
];

export const Challenges: React.FC = () => {
  const [activeChallenge, setActiveChallenge] = useState<Challenge>(MOCK_ACTIVE_CHALLENGE);
  const [entries, setEntries] = useState<ChallengeEntry[]>(INITIAL_ENTRIES.sort((a,b) => b.votes - a.votes));
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Admin / Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    endDate: '',
    prize: ''
  });

  const handleVote = (entryId: string) => {
    setEntries(prev => {
        const updated = prev.map(entry => {
            if (entry.id === entryId) {
                const isVoted = entry.hasVoted;
                return {
                    ...entry,
                    votes: isVoted ? entry.votes - 1 : entry.votes + 1,
                    hasVoted: !isVoted
                };
            }
            return entry;
        });

        // Re-sort by votes descending, then by ID for stability
        return updated.sort((a, b) => {
            if (b.votes !== a.votes) return b.votes - a.votes;
            return a.id.localeCompare(b.id);
        });
    });
  };

  const handleSubmit = () => {
    // Simulate submitting a video
    const newEntry: ChallengeEntry = {
      id: `e-${Date.now()}`,
      challengeId: activeChallenge.id,
      user: {
        id: 'me',
        username: 'skater_boi_2000',
        avatarUrl: 'https://picsum.photos/200/200?random=10',
        followers: 1200,
        following: 340,
      },
      videoUrl: 'https://media.istockphoto.com/id/1152063319/video/skateboarder-doing-an-ollie-in-slow-motion.mp4?s=mp4-640x640-is&k=20&c=wR04d6H3dPU-7v0-IBrvNnJt-bS4EwbYvV7xQk7Lh-8=',
      votes: 0,
      hasVoted: false
    };
    
    setEntries(prev => [newEntry, ...prev]);
    setHasSubmitted(true);
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    const newChallenge: Challenge = {
      id: `c-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      endDate: formData.endDate,
      isActive: true,
      prize: formData.prize
    };
    
    // Set as active challenge
    setActiveChallenge(newChallenge);
    
    // Reset entries for the new challenge
    setEntries([]);
    setHasSubmitted(false);
    
    // Close modal
    setShowCreateModal(false);
    setFormData({ title: '', description: '', endDate: '', prize: '' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 pb-24 md:pt-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
          <h1 className="font-display text-4xl tracking-tighter italic text-slate-900">
            WEEKLY <span className="text-blue-600">BATTLES</span>
          </h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center space-x-2 text-sm border border-slate-200 rounded-lg px-3 py-1 bg-white hover:border-slate-300 shadow-sm"
          >
             <SettingsIcon className="w-4 h-4" />
             <span className="hidden md:inline">Admin: Create Challenge</span>
          </button>
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 relative animate-fade-in shadow-2xl">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"
              >
                ✕
              </button>
              
              <h2 className="font-display text-2xl text-slate-900 italic mb-6">NEW CHALLENGE</h2>
              
              <form onSubmit={handleCreateChallenge} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">TITLE</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                      placeholder="e.g. Best Kickflip"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">DESCRIPTION</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all h-24 resize-none"
                      placeholder="Rules and details..."
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">END DATE</label>
                        <input 
                          type="text" 
                          required
                          value={formData.endDate}
                          onChange={e => setFormData({...formData, endDate: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                          placeholder="e.g. 3 days left"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">PRIZE</label>
                        <input 
                          type="text" 
                          required
                          value={formData.prize}
                          onChange={e => setFormData({...formData, prize: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                          placeholder="e.g. Golden Deck"
                        />
                    </div>
                 </div>
                 
                 <button 
                   type="submit"
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors uppercase tracking-wide shadow-lg shadow-blue-600/30"
                 >
                   Launch Challenge
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Active Challenge Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 mb-12 group shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10"></div>
        <img 
            src="https://images.unsplash.com/photo-1520045864914-699830d6e60b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80" 
            className="w-full h-64 object-cover opacity-50"
            alt="Challenge background"
        />
        
        <div className="absolute inset-0 z-20 p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <FireIcon className="w-5 h-5 animate-pulse" filled />
                <span className="font-bold tracking-wide text-sm uppercase">Active Challenge</span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl text-white italic tracking-tight mb-2">
                {activeChallenge.title.toUpperCase()}
            </h2>
            <p className="text-slate-300 max-w-lg mb-6 text-sm md:text-base">
                {activeChallenge.description}
            </p>
            
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-8">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20">
                    <TrophyIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-white text-sm font-bold">Prize: {activeChallenge.prize}</span>
                </div>
                <div className="text-slate-400 text-sm font-mono">
                    Ends in: <span className="text-white font-bold">{activeChallenge.endDate}</span>
                </div>
            </div>

            <div className="mt-8">
                {!hasSubmitted ? (
                    <button 
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg flex items-center space-x-2 transition-colors transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/30"
                    >
                        <PlusSquareIcon className="w-5 h-5" />
                        <span>SUBMIT YOUR CLIP</span>
                    </button>
                ) : (
                     <button 
                        disabled
                        className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg flex items-center space-x-2 cursor-default shadow-lg"
                    >
                        <CheckIcon className="w-5 h-5" />
                        <span>ENTRY SUBMITTED</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Entries Section */}
      <div className="mb-12">
          <h3 className="font-display text-2xl text-slate-900 mb-6 flex items-center">
              TOP ENTRIES <span className="text-slate-500 ml-3 text-lg font-sans font-normal">Vote for the winner</span>
          </h3>
          
          {entries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {entries.map((entry, index) => (
                    <div key={entry.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="relative aspect-video bg-slate-900">
                            <video 
                                src={entry.videoUrl} 
                                className="w-full h-full object-cover"
                                controls
                                poster="https://picsum.photos/600/340?grayscale"
                            />
                            <div className={`absolute top-2 left-2 backdrop-blur px-2 py-1 rounded text-white text-xs font-bold ${index === 0 ? 'bg-blue-600 text-white' : 'bg-black/60'}`}>
                                #{index + 1}
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <img src={entry.user.avatarUrl} className="w-8 h-8 rounded-full border border-slate-200" alt={entry.user.username} />
                                <span className="text-slate-900 font-bold text-sm">{entry.user.username}</span>
                            </div>
                            
                            <button 
                                onClick={() => handleVote(entry.id)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 transform active:scale-95 ${
                                    entry.hasVoted 
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                <FireIcon className={`w-5 h-5 ${entry.hasVoted ? 'animate-pulse' : ''}`} filled={entry.hasVoted} />
                                <span className="font-mono font-bold text-lg">{entry.votes}</span>
                                <span className={`text-xs font-bold uppercase ml-1 ${entry.hasVoted ? 'text-red-100' : 'text-slate-500'}`}>
                                    {entry.hasVoted ? 'Voted' : 'Vote'}
                                </span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                <p className="text-slate-500 italic">No entries yet. Be the first to submit!</p>
            </div>
          )}
      </div>

      {/* Past Winners */}
      <div>
         <h3 className="font-display text-2xl text-slate-900 mb-6">HALL OF FAME</h3>
         <div className="space-y-4">
             {MOCK_PAST_CHALLENGES.map(challenge => (
                 <div key={challenge.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                     <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
                         <div className="mb-2 md:mb-0">
                             <span className="text-xs text-slate-500 uppercase tracking-widest block">Challenge</span>
                             <span className="text-slate-900 font-bold">{challenge.title}</span>
                         </div>
                         <div className="hidden md:block w-px h-8 bg-slate-200"></div>
                         <div>
                             <span className="text-xs text-slate-500 uppercase tracking-widest block">Winner</span>
                             <div className="flex items-center space-x-2 mt-1">
                                 {challenge.winner && (
                                     <>
                                        <img src={challenge.winner.avatarUrl} className="w-5 h-5 rounded-full" alt="winner" />
                                        <span className="text-blue-600 font-bold text-sm">{challenge.winner.username}</span>
                                     </>
                                 )}
                             </div>
                         </div>
                     </div>
                     <div className="bg-blue-50 p-2 rounded-lg">
                         <TrophyIcon className="w-6 h-6 text-blue-600" />
                     </div>
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
};
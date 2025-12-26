import React, { useState } from 'react';
import { Post } from '../types';
import { HeartIcon, MessageCircleIcon, Share2Icon } from './Icons';

// Mock Data
const MOCK_POSTS: Post[] = [
  {
    id: '1',
    userId: 'u1',
    videoUrl: 'https://media.istockphoto.com/id/1152063319/video/skateboarder-doing-an-ollie-in-slow-motion.mp4?s=mp4-640x640-is&k=20&c=wR04d6H3dPU-7v0-IBrvNnJt-bS4EwbYvV7xQk7Lh-8=', 
    description: 'First try 🛹 #skate #kickflip',
    likes: 124,
    comments: 12,
    shares: 4,
    createdAt: '2h ago',
    filterUsed: 'VX1000',
    user: {
      id: 'u1',
      username: 'thrasher_fan_99',
      avatarUrl: 'https://picsum.photos/100/100?random=1',
      followers: 1200,
      following: 300,
    }
  },
  {
    id: '2',
    userId: 'u2',
    videoUrl: 'https://media.istockphoto.com/id/1181822363/video/teenager-skating-at-the-skate-park.mp4?s=mp4-640x640-is&k=20&c=hC7O9yB1yE5gX_v5q5sO6l6J5_j5h2_y4q4w4_5u5_8=',
    description: 'Late night sessions at the plaza. Using the new VHS filter!',
    likes: 89,
    comments: 5,
    shares: 2,
    createdAt: '5h ago',
    filterUsed: 'VHS',
    user: {
      id: 'u2',
      username: 'night_rider',
      avatarUrl: 'https://picsum.photos/100/100?random=2',
      followers: 450,
      following: 120,
    }
  }
];

const VideoPost: React.FC<{ post: Post }> = ({ post }) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-slate-100">
        <img 
          src={post.user.avatarUrl} 
          alt={post.user.username} 
          className="w-10 h-10 rounded-full object-cover border border-slate-200"
        />
        <div className="ml-3">
          <p className="text-sm font-bold text-slate-900">{post.user.username}</p>
          <p className="text-xs text-slate-500">{post.createdAt}</p>
        </div>
        {post.filterUsed && (
            <span className="ml-auto text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-bold tracking-wider border border-blue-100">
              {post.filterUsed}
            </span>
        )}
      </div>

      {/* Video Content */}
      <div className="relative w-full aspect-square bg-slate-900 overflow-hidden">
        <video 
          src={post.videoUrl} 
          className="w-full h-full object-cover" 
          controls 
          loop 
          playsInline
          poster="https://picsum.photos/600/600?grayscale"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex space-x-4">
          <button onClick={() => setLiked(!liked)} className="group transition-transform active:scale-90">
            <HeartIcon className={`w-7 h-7 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-slate-900 group-hover:text-red-500'}`} />
          </button>
          <button className="group transition-transform active:scale-90">
            <MessageCircleIcon className="w-7 h-7 text-slate-900 group-hover:text-blue-500 transition-colors" />
          </button>
          <button className="group transition-transform active:scale-90">
            <Share2Icon className="w-7 h-7 text-slate-900 group-hover:text-green-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-4">
        <p className="text-sm text-slate-900">
          <span className="font-bold mr-2">{post.likes + (liked ? 1 : 0)} likes</span>
        </p>
        <p className="text-sm text-slate-600 mt-1">
          <span className="font-bold text-slate-900 mr-1">{post.user.username}</span>
          {post.description}
        </p>
      </div>
    </div>
  );
};

export const Feed: React.FC = () => {
  return (
    <div className="w-full max-w-lg mx-auto pb-20 pt-16 md:pt-4">
      <div className="md:hidden fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md z-10 border-b border-slate-200 p-4 shadow-sm">
          <h1 className="font-display text-2xl tracking-tighter italic text-slate-900 text-center">SKATER<span className="text-blue-600">ADE</span></h1>
      </div>
      
      {/* Desktop Header */}
      <div className="hidden md:block mb-8 px-2">
          <h1 className="font-display text-4xl tracking-tighter italic text-slate-900">LATEST <span className="text-blue-600">CLIPS</span></h1>
      </div>

      {MOCK_POSTS.map(post => (
        <VideoPost key={post.id} post={post} />
      ))}
    </div>
  );
};
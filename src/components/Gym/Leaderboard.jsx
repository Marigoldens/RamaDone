import React from 'react';
import { Trophy, Star } from 'lucide-react';

const STATIC_LEADERBOARD = [
  { id: 1, name: 'Alex M.', points: 12500, rank: 1, trend: 'up' },
  { id: 2, name: 'Kinetic User', points: 11200, rank: 2, trend: 'neutral' }, // The user
  { id: 3, name: 'Sarah J.', points: 9800, rank: 3, trend: 'up' },
  { id: 4, name: 'Mike T.', points: 8400, rank: 4, trend: 'down' },
  { id: 5, name: 'Elena R.', points: 7200, rank: 5, trend: 'up' },
];

export default function Leaderboard() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg mb-2 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand to-accent p-[2px] shadow-lg shadow-brand/20">
            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
              <Trophy size={24} className="text-brand" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-primary tracking-tight uppercase">Global Rank</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-brand font-bold text-sm tracking-widest uppercase">Top 15%</span>
              <span className="text-muted text-xs">•</span>
              <span className="text-muted text-xs font-mono font-bold tracking-wider">11,200 PTS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {STATIC_LEADERBOARD.map((user) => (
          <div 
            key={user.id} 
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              user.name === 'Kinetic User' 
                ? 'bg-brand/5 border-brand/20 shadow-inner' 
                : 'bg-surface-elevated border-border'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-8 font-black font-mono text-center ${
                user.rank === 1 ? 'text-yellow-500' :
                user.rank === 2 ? 'text-gray-400' :
                user.rank === 3 ? 'text-amber-700' :
                'text-muted'
              }`}>
                #{user.rank}
              </div>
              <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                <span className="text-primary font-bold text-xs uppercase">
                  {user.name.substring(0,2)}
                </span>
              </div>
              <div className="flex flex-col truncate pr-2">
                <span className={`font-bold tracking-tight truncate ${user.name === 'Kinetic User' ? 'text-brand' : 'text-primary'}`}>
                  {user.name}
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted">
                  Level {Math.floor(user.points / 1000)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-xl border border-border shrink-0">
              <Star size={12} className={user.name === 'Kinetic User' ? 'text-brand' : 'text-muted'} />
              <span className="font-mono font-bold text-xs text-primary">{user.points.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

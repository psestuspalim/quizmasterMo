import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Crown, TrendingUp, Swords, Trophy, BarChart3, ClipboardList, Plus } from 'lucide-react';
import AdminMenu from '../admin/AdminMenu';

export default function MainNav({ 
  isAdmin, 
  onOpenContentManager, 
  onOpenQuizExporter, 
  onOpenFeatureAnalytics,
  onJoinCourse,
  compact = false 
}) {
  const navItems = [
    { label: 'Ranking', path: 'Leaderboard', icon: Crown, color: 'yellow' },
    { label: 'Progreso', path: 'Progress', icon: TrendingUp, color: 'indigo' },
    { label: 'Desafío', path: 'GameLobby', icon: Swords, color: 'purple' },
    { label: 'Torneo', path: 'TournamentLobby', icon: Trophy, color: 'amber' },
  ];

  const colorClasses = {
    yellow: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50',
    indigo: 'border-indigo-600 text-indigo-600 hover:bg-indigo-50',
    purple: 'border-purple-600 text-purple-600 hover:bg-purple-50',
    amber: 'border-amber-600 text-amber-600 hover:bg-amber-50',
    green: 'border-green-600 text-green-600 hover:bg-green-50'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!isAdmin && onJoinCourse && (
        <Button 
          onClick={onJoinCourse}
          variant="outline"
          className={`text-xs sm:text-sm h-9 ${colorClasses.green}`}
        >
          <Plus className="w-4 h-4 mr-2" /> 
          Unirse a Curso
        </Button>
      )}

      {navItems.map((item) => (
        <Link key={item.path} to={createPageUrl(item.path)}>
          <Button 
            variant="outline" 
            className={`text-xs sm:text-sm h-9 ${colorClasses[item.color]}`}
          >
            <item.icon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        </Link>
      ))}

      {isAdmin && (
        <AdminMenu 
          compact={compact}
          onOpenContentManager={onOpenContentManager}
          onOpenQuizExporter={onOpenQuizExporter}
          onOpenFeatureAnalytics={onOpenFeatureAnalytics}
        />
      )}
    </div>
  );
}
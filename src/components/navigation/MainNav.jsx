import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import AdminMenu from '../admin/AdminMenu';

export default function MainNav({ 
  isAdmin, 
  onOpenContentManager, 
  onOpenQuizExporter, 
  onOpenFeatureAnalytics,
  onJoinCourse,
  compact = false 
}) {
  const navItems = [];

  const colorClasses = {
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
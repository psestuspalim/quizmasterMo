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
  compact = false 
}) {
  return (
    <div className="flex flex-wrap gap-2">
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
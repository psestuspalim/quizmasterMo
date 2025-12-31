import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminDashboardCard({ 
  title, 
  description, 
  count, 
  items = [], 
  primaryActionLabel, 
  primaryActionTo,
  icon: Icon,
  countColor = 'text-indigo-600',
  iconColor = 'text-indigo-600'
}) {
  return (
    <Card className="border-2 hover:border-indigo-300 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
          </div>
          {count !== undefined && (
            <Badge className={`text-2xl font-bold px-3 py-1 ${countColor} bg-indigo-50 border-indigo-200`}>
              {count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de items */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.primary}</p>
                  {item.secondary && (
                    <p className="text-xs text-gray-500 truncate">{item.secondary}</p>
                  )}
                </div>
                {item.badge && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">
            No hay datos disponibles
          </div>
        )}

        {/* Botón principal */}
        <Link to={createPageUrl(primaryActionTo)}>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
            {primaryActionLabel}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
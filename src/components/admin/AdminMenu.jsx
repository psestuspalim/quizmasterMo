import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Settings, Users, BarChart3, ClipboardList, Trash2, 
  ChevronDown, Shield, FileQuestion, Cog
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export default function AdminMenu({ 
  onOpenContentManager,
  onOpenQuizSettings,
  compact = false 
}) {
  const menuItems = [
    {
      label: 'Progreso Estudiantes',
      icon: BarChart3,
      href: 'AdminProgress',
      description: 'Ver estadísticas'
    },
    {
      label: 'Tareas Asignadas',
      icon: ClipboardList,
      href: 'AdminTasks',
      description: 'Gestionar tareas'
    },
  ];

  const actions = [
    {
      label: 'Gestionar Contenido',
      icon: Trash2,
      onClick: onOpenContentManager,
      description: 'Eliminar cursos, carpetas, materias'
    },
  ];

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1 border-purple-300 text-purple-600 hover:bg-purple-50">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-gray-500">
            Panel de Administrador
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {menuItems.map((item) => (
            <Link key={item.href} to={createPageUrl(item.href)}>
              <DropdownMenuItem className="cursor-pointer">
                <item.icon className="w-4 h-4 mr-2 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </DropdownMenuItem>
            </Link>
          ))}
          
          <DropdownMenuSeparator />
          
          {actions.map((action, idx) => (
            <DropdownMenuItem 
              key={idx} 
              onClick={action.onClick}
              className="cursor-pointer"
            >
              <action.icon className="w-4 h-4 mr-2 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm">{action.label}</p>
                <p className="text-xs text-gray-400">{action.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((item) => (
        <Link key={item.href} to={createPageUrl(item.href)}>
          <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm border-gray-300 hover:bg-gray-50">
            <item.icon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        </Link>
      ))}
      {actions.map((action, idx) => (
        <Button 
          key={idx}
          variant="outline" 
          size="sm" 
          onClick={action.onClick}
          className="h-9 text-xs sm:text-sm border-gray-300 hover:bg-gray-50"
        >
          <action.icon className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
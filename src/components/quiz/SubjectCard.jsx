import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, FileText } from 'lucide-react';

export default function SubjectCard({ subject, quizCount, onClick }) {
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2"
      style={{ borderColor: subject.color || '#6366f1' }}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${subject.color || '#6366f1'}20` }}
          >
            <FolderOpen 
              className="w-8 h-8"
              style={{ color: subject.color || '#6366f1' }}
            />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {subject.name}
            </h3>
            {subject.description && (
              <p className="text-sm text-gray-500 mb-3">
                {subject.description}
              </p>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{quizCount} cuestionarios</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
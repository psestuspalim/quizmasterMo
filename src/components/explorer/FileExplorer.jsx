import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Folder, BookOpen, FileText, FolderInput, Scissors, Copy, Clipboard,
  CheckSquare, X, ChevronRight, GraduationCap, MoreVertical, Sparkles
} from 'lucide-react';
import { canMoveItemToTarget, prepareMoveData, isValidMove } from '../../utils/filesystem';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const typeIcons = {
  course: GraduationCap,
  folder: Folder,
  subject: BookOpen,
  quiz: FileText
};

export default function FileExplorer({ 
  containers = [],
  quizzes = [],
  onMoveItems,
  onCopyItems,
  onItemClick,
  onChangeType,
  onGetContainerType,
  isAdmin = false,
  currentContainerId = null
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [clipboard, setClipboard] = useState(null); // { items: [], operation: 'cut' | 'copy' }
  const [moveDialog, setMoveDialog] = useState({ open: false, targetId: null, targetType: null });
  const [instructionsDialog, setInstructionsDialog] = useState(false);
  const [instructions, setInstructions] = useState('');

  // Toggle selection
  const toggleSelect = (type, id) => {
    const key = `${type}-${id}`;
    setSelectedItems(prev => 
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
    );
  };

  const selectAll = (items, type) => {
    const keys = items.map(item => `${type}-${item.id}`);
    setSelectedItems(prev => {
      const allSelected = keys.every(k => prev.includes(k));
      return allSelected ? prev.filter(k => !keys.includes(k)) : [...new Set([...prev, ...keys])];
    });
  };

  const clearSelection = () => setSelectedItems([]);

  // Cut/Copy operations
  const cutItems = () => {
    if (selectedItems.length === 0) return;
    setClipboard({ items: selectedItems, operation: 'cut' });
    toast.info(`${selectedItems.length} elementos cortados`);
  };

  const copyItems = () => {
    if (selectedItems.length === 0) return;
    setClipboard({ items: selectedItems, operation: 'copy' });
    toast.info(`${selectedItems.length} elementos copiados`);
  };

  // Paste operation
  const pasteItems = async (targetId, targetType) => {
    if (!clipboard) return;
    
    try {
      const itemsToProcess = clipboard.items.map(key => {
        const [type, id] = key.split('-');
        return { type, id };
      });

      // Validar movimientos
      const invalidMoves = itemsToProcess.filter(item => 
        !canMoveItemToTarget(item.type, targetType)
      );
      
      if (invalidMoves.length > 0) {
        toast.error(`No se pueden mover ${invalidMoves.length} elementos a este destino`);
        return;
      }

      if (clipboard.operation === 'cut') {
        await onMoveItems(itemsToProcess, targetId, targetType);
        toast.success('Elementos movidos correctamente');
      } else {
        // Copy operation - only for quizzes
        const quizzesToCopy = itemsToProcess.filter(item => item.type === 'quiz');
        if (quizzesToCopy.length > 0) {
          await onCopyItems(quizzesToCopy, targetId);
          toast.success(`${quizzesToCopy.length} cuestionarios copiados`);
        }
      }
      
      if (clipboard.operation === 'cut') {
        setClipboard(null);
      }
      clearSelection();
      
      setMoveDialog({ open: false, targetId: null, targetType: null });
    } catch (error) {
      toast.error(`Error al ${clipboard.operation === 'cut' ? 'mover' : 'copiar'} elementos`);
    }
  };

  // Process instructions
  const processInstructions = async () => {
    if (!instructions.trim() || !clipboard) return;
    
    try {
      // Parse instructions like "move quiz-abc123 to subject-xyz789"
      const lines = instructions.trim().split('\n');
      
      for (const line of lines) {
        const match = line.match(/mover?\s+(.+?)\s+a\s+(.+)/i);
        if (match) {
          const itemKey = match[1].trim();
          const targetId = match[2].trim().replace(/^(course|folder|subject)-/, '');
          
          if (clipboard.items.includes(itemKey)) {
            const [type, id] = itemKey.split('-');
            await onMoveItems([{ type, id }], targetId);
          }
        }
      }
      
      toast.success('Instrucciones procesadas');
      setClipboard(null);
      clearSelection();
      setInstructions('');
      setInstructionsDialog(false);
    } catch (error) {
      toast.error('Error al procesar instrucciones');
    }
  };

  // Render item with selection
  const renderItem = (item, type) => {
    const Icon = typeIcons[type] || FileText;
    const key = `${type}-${item.id}`;
    const isSelected = selectedItems.includes(key);
    const isCut = clipboard?.operation === 'cut' && clipboard.items.includes(key);

    return (
      <div
        key={key}
        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all group ${
          isSelected 
            ? 'bg-indigo-50 border-indigo-400' 
            : 'bg-white border-gray-200 hover:border-gray-300'
        } ${isCut ? 'opacity-50' : ''}`}
      >
        {isAdmin && (
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => toggleSelect(type, item.id)}
            className="shrink-0"
          />
        )}
        
        <div 
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => onItemClick && onItemClick(type, item)}
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${item.color || '#6366f1'}20` }}
          >
            {item.icon ? (
              <span className="text-sm">{item.icon}</span>
            ) : (
              <Icon className="w-4 h-4" style={{ color: item.color || '#6366f1' }} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{item.name || item.title}</p>
            {item.description && (
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            )}
          </div>

          {item.is_hidden && (
            <Badge variant="outline" className="text-xs">Oculto</Badge>
          )}
          
          {isAdmin && type !== 'quiz' && (
            <Badge variant="outline" className="text-xs font-mono bg-gray-50 text-gray-600">
              ID: {item.id.slice(0, 8)}
            </Badge>
          )}
        </div>

        {isAdmin && type !== 'quiz' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setMoveDialog({ open: true, targetId: item.id, targetType: type });
              }}
              className="opacity-0 group-hover:opacity-100"
              title="Pegar aquí"
              disabled={!clipboard}
            >
              <FolderInput className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onChangeType && onChangeType(item.id, type, 'course');
                }} disabled={type === 'course'}>
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Convertir a Curso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onChangeType && onChangeType(item.id, type, 'folder');
                }} disabled={type === 'folder'}>
                  <Folder className="w-4 h-4 mr-2" />
                  Convertir a Carpeta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onChangeType && onChangeType(item.id, type, 'subject');
                }} disabled={type === 'subject'}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Convertir a Materia
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {type !== 'quiz' && <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
          {selectedItems.length > 0 ? (
            <>
              <Badge className="bg-indigo-600">{selectedItems.length} seleccionados</Badge>
              <Button variant="outline" size="sm" onClick={cutItems}>
                <Scissors className="w-4 h-4 mr-2" />
                Cortar
              </Button>
              <Button variant="outline" size="sm" onClick={copyItems}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setInstructionsDialog(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Instrucciones
              </Button>
            </>
          ) : clipboard ? (
            <>
              <Badge className="bg-amber-100 text-amber-700">
                {clipboard.items.length} en portapapeles ({clipboard.operation === 'cut' ? 'Cortar' : 'Copiar'})
              </Badge>
              {currentContainerId && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setMoveDialog({ open: true, targetId: currentContainerId })}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Clipboard className="w-4 h-4 mr-2" />
                  Pegar aquí
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Selecciona elementos para mover</p>
          )}
        </div>
      )}

      {/* Content sections */}
      <div className="space-y-6">
        {/* Courses */}
        {containers.filter(c => c.type === 'course').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Cursos
              </h3>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => selectAll(containers.filter(c => c.type === 'course'), 'course')}
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Todos
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {containers.filter(c => c.type === 'course').map(item => renderItem(item, 'course'))}
            </div>
          </div>
        )}

        {/* Folders */}
        {containers.filter(c => c.type === 'folder').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Carpetas
              </h3>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => selectAll(containers.filter(c => c.type === 'folder'), 'folder')}
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Todos
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {containers.filter(c => c.type === 'folder').map(item => renderItem(item, 'folder'))}
            </div>
          </div>
        )}

        {/* Subjects */}
        {containers.filter(c => c.type === 'subject').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Materias
              </h3>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => selectAll(containers.filter(c => c.type === 'subject'), 'subject')}
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Todos
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {containers.filter(c => c.type === 'subject').map(item => renderItem(item, 'subject'))}
            </div>
          </div>
        )}

        {/* Quizzes */}
        {quizzes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Cuestionarios
              </h3>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => selectAll(quizzes, 'quiz')}
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Todos
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {quizzes.map(item => renderItem(item, 'quiz'))}
            </div>
          </div>
        )}
      </div>

      {/* Move Dialog */}
      <AlertDialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ open: false, targetId: null, targetType: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clipboard?.operation === 'cut' ? 'Confirmar movimiento' : 'Confirmar copia'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clipboard?.operation === 'cut' 
                ? `¿Mover ${clipboard?.items?.length || 0} elementos a este destino?`
                : `¿Copiar ${clipboard?.items?.filter(k => k.startsWith('quiz-')).length || 0} cuestionarios a este destino?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pasteItems(moveDialog.targetId, moveDialog.targetType)}>
              {clipboard?.operation === 'cut' ? 'Mover aquí' : 'Copiar aquí'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Instructions Dialog */}
      <AlertDialog open={instructionsDialog} onOpenChange={setInstructionsDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Instrucciones de transferencia</AlertDialogTitle>
            <AlertDialogDescription>
              Usa los IDs visibles en cada contenedor para especificar destinos.
              <br />
              Ejemplo: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">mover quiz-abc123 a xyz789</code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Elementos seleccionados:</p>
            <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
              {clipboard?.items.map(key => (
                <div key={key} className="text-xs font-mono text-gray-600">{key}</div>
              ))}
            </div>
          </div>

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="mover quiz-abc123 a xyz789&#10;mover subject-def456 a xyz789"
            className="w-full h-32 p-3 border rounded-md text-sm font-mono"
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={processInstructions} disabled={!instructions.trim()}>
              Ejecutar instrucciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
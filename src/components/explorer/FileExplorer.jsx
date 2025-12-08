import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Folder, BookOpen, FileText, FolderInput, Scissors, Copy, Clipboard,
  CheckSquare, X, ChevronRight, GraduationCap, MoreVertical, Sparkles, ChevronDown
} from 'lucide-react';
import { canMoveItemToTarget } from '../utils/filesystem';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
import { motion, AnimatePresence } from 'framer-motion';

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
  const [clipboard, setClipboard] = useState(null);
  const [moveDialog, setMoveDialog] = useState({ open: false, targetId: null, targetType: null });
  const [instructionsDialog, setInstructionsDialog] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [expandedContainers, setExpandedContainers] = useState(new Set());
  const [dragOverContainer, setDragOverContainer] = useState(null);

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

  // Toggle expand
  const toggleExpand = (containerId) => {
    setExpandedContainers(prev => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  };

  // Get children of a container
  const getChildren = (containerId, containerType) => {
    if (containerType === 'subject') {
      return quizzes.filter(q => q.subject_id === containerId);
    }
    if (containerType === 'course') {
      return [
        ...containers.filter(c => c.type === 'folder' && c.course_id === containerId && !c.parent_id),
        ...containers.filter(c => c.type === 'subject' && c.course_id === containerId && !c.folder_id),
        ...quizzes.filter(q => {
          // Quizzes de materias que pertenecen a este curso
          const parentSubject = containers.find(c => c.type === 'subject' && c.id === q.subject_id);
          return parentSubject && parentSubject.course_id === containerId && !parentSubject.folder_id;
        })
      ];
    }
    if (containerType === 'folder') {
      return [
        ...containers.filter(c => c.type === 'folder' && c.parent_id === containerId),
        ...containers.filter(c => c.type === 'subject' && c.folder_id === containerId),
        ...quizzes.filter(q => {
          // Quizzes de materias que pertenecen a esta carpeta
          const parentSubject = containers.find(c => c.type === 'subject' && c.id === q.subject_id);
          return parentSubject && parentSubject.folder_id === containerId;
        })
      ];
    }
    return [];
  };

  // Drag and drop handler
  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    setDragOverContainer(null);
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const [dragType, dragId] = draggableId.split('-');
    const [destType, destId] = destination.droppableId.split('-');

    // Si hay múltiples seleccionados y el item dragged es uno de ellos, mover todos
    const itemsToMove = selectedItems.includes(draggableId) 
      ? selectedItems.map(key => {
          const [type, id] = key.split('-');
          return { type, id };
        })
      : [{ type: dragType, id: dragId }];

    try {
      if (destType === 'root') {
        // Mover a raíz (sin contenedor padre)
        await onMoveItems(itemsToMove, null, null);
      } else {
        // Determinar el tipo correcto del destino
        const targetContainer = containers.find(c => c.id === destId);
        const targetType = targetContainer ? targetContainer.type : destType;
        await onMoveItems(itemsToMove, destId, targetType);
      }
      clearSelection();
      toast.success('Elementos movidos correctamente');
    } catch (error) {
      console.error('Error al mover:', error);
      toast.error('Error al mover elementos');
    }
  };

  const handleDragUpdate = (update) => {
    if (update.destination) {
      const [destType, destId] = update.destination.droppableId.split('-');
      if (destType !== 'root' && destId) {
        setDragOverContainer(destId);
        // Auto-expandir inmediatamente
        setExpandedContainers(prev => new Set([...prev, destId]));
      }
    } else {
      setDragOverContainer(null);
    }
  };

  // Render draggable item
  const renderItem = (item, type, index) => {
    const Icon = typeIcons[type] || FileText;
    const key = `${type}-${item.id}`;
    const isSelected = selectedItems.includes(key);
    const isExpanded = expandedContainers.has(item.id);
    const children = type !== 'quiz' ? getChildren(item.id, type) : [];
    const hasChildren = children.length > 0;
    const isDragOver = dragOverContainer === item.id;

    return (
      <Draggable draggableId={key} index={index} key={key} isDragDisabled={!isAdmin}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all group ${
                isSelected 
                  ? 'bg-indigo-50 border-indigo-400' 
                  : isDragOver
                  ? 'bg-amber-50 border-amber-400 shadow-lg'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${snapshot.isDragging ? 'shadow-2xl opacity-90' : ''}`}
            >
              {isAdmin && (
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(type, item.id)}
                  className="shrink-0"
                />
              )}
              
              {type !== 'quiz' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.id);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'} ${!hasChildren ? 'opacity-30' : ''}`} />
                </Button>
              )}
              
              <div 
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => !hasChildren && onItemClick && onItemClick(type, item)}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
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
              )}
            </div>

            {/* Children expandidos con droppable */}
            <AnimatePresence>
              {isExpanded && hasChildren && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-8 mt-2"
                >
                  <Droppable droppableId={`${type}-${item.id}`} type="ITEM">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 p-2 rounded-lg border-2 border-dashed min-h-[60px] ${
                          snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                        }`}
                      >
                        {children.map((child, idx) => {
                          const childType = child.subject_id !== undefined ? 'quiz' : child.type;
                          return renderItem(child, childType, idx);
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Draggable>
    );
  };

  // Obtener todos los contenedores de nivel raíz (sin padres)
  const rootContainers = containers.filter(c => {
    if (c.type === 'course') return true;
    if (c.type === 'folder') return !c.course_id && !c.parent_id;
    if (c.type === 'subject') return !c.course_id && !c.folder_id;
    return false;
  });

  const rootQuizzes = quizzes.filter(q => !q.subject_id);

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate}>
      <div className="space-y-4">
        {/* Toolbar */}
        {isAdmin && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            {selectedItems.length > 0 ? (
              <>
                <Badge className="bg-indigo-600">{selectedItems.length} seleccionados</Badge>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="w-4 h-4 mr-2" />
                  Limpiar selección
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Arrastra elementos para moverlos entre contenedores</p>
            )}
          </div>
        )}

        {/* Droppable root */}
        <Droppable droppableId="root" type="ITEM">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 min-h-[200px] p-4 rounded-lg border-2 border-dashed ${
                snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              {rootContainers.length === 0 && rootQuizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No hay contenido en el nivel raíz</p>
                </div>
              ) : (
                <>
                  {rootContainers.map((item, idx) => renderItem(item, item.type, idx))}
                  {rootQuizzes.map((item, idx) => renderItem(item, 'quiz', rootContainers.length + idx))}
                </>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

      </div>
    </DragDropContext>
  );
}
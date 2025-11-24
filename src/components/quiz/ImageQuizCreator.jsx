import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Trash2, Circle, ArrowRight, Save, X, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BLOCK_SIZE = 50;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
const STORAGE_KEY = 'imageQuizCreator_draft';

export default function ImageQuizCreator({ onSave, onCancel }) {
  const [allImages, setAllImages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.allImages || [];
      }
    } catch (e) {}
    return [];
  });
  const [currentBlock, setCurrentBlock] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).currentBlock || 0;
    } catch (e) {}
    return 0;
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).currentIndex || 0;
    } catch (e) {}
    return 0;
  });
  const [newOption, setNewOption] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [markerType, setMarkerType] = useState('circle');
  const [isUploading, setIsUploading] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const [selectionMode, setSelectionMode] = useState('option'); // 'option' or 'title'
  const [descriptionsJson, setDescriptionsJson] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);
  const imageRef = useRef(null);
  const descriptionRef = useRef(null);

  const applyDescriptionsFromJson = () => {
    try {
      const parsed = JSON.parse(descriptionsJson);
      if (!Array.isArray(parsed)) return;
      
      const updatedImages = [...allImages];
      parsed.forEach(item => {
        const imgIndex = updatedImages.findIndex(img => 
          img.url.toLowerCase().includes(item.nombre?.toLowerCase()) ||
          img.originalName?.toLowerCase().includes(item.nombre?.toLowerCase())
        );
        if (imgIndex !== -1 && item.descripcion) {
          updatedImages[imgIndex] = {
            ...updatedImages[imgIndex],
            description: item.descripcion
          };
        }
      });
      setAllImages(updatedImages);
      setShowJsonInput(false);
      setDescriptionsJson('');
    } catch (e) {
      alert('JSON inválido');
    }
  };

  // Guardar en localStorage cuando cambian los datos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        allImages,
        currentBlock,
        currentIndex
      }));
    } catch (e) {}
  }, [allImages, currentBlock, currentIndex]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const blockStart = currentBlock * BLOCK_SIZE;
  const blockEnd = Math.min(blockStart + BLOCK_SIZE, allImages.length);
  const blockImages = allImages.slice(blockStart, blockEnd);
  const totalBlocks = Math.ceil(allImages.length / BLOCK_SIZE);
  const currentImage = allImages[blockStart + currentIndex];

  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedImages = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        const elements = fileName.split(',').map(el => el.trim()).filter(el => el);
        const newOptions = elements.map(text => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text,
          isCorrect: true
        }));

        uploadedImages.push({
          url: file_url,
          file,
          options: newOptions,
          markers: [],
          description: ''
        });
      }
      setAllImages([...allImages, ...uploadedImages]);
      if (allImages.length === 0) {
        setCurrentBlock(0);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    }
    setIsUploading(false);
  };

  const globalIndex = blockStart + currentIndex;

  const updateCurrentImage = (updates) => {
    const newImages = [...allImages];
    newImages[globalIndex] = { ...newImages[globalIndex], ...updates };
    setAllImages(newImages);
  };

  const addOption = (text = newOption) => {
    if (!currentImage || !text.trim()) return;
    if (currentImage.options.find(o => o.text.toLowerCase() === text.trim().toLowerCase())) return;
    
    const newOpt = { 
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text.trim(), 
      isCorrect: true 
    };
    
    updateCurrentImage({
      options: [...currentImage.options, newOpt]
    });
    setNewOption('');
    return newOpt;
  };

  const removeOption = (id) => {
    if (!currentImage) return;
    updateCurrentImage({
      options: currentImage.options.filter(o => o.id !== id),
      markers: currentImage.markers.filter(m => m.optionId !== id)
    });
    if (selectedOption === id) setSelectedOption(null);
  };

  const handleImageClick = (e) => {
    if (!selectedOption || !imageRef.current || !currentImage) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker = {
      id: Date.now().toString(),
      optionId: selectedOption,
      type: markerType,
      x,
      y
    };

    updateCurrentImage({
      markers: [...currentImage.markers, newMarker]
    });
  };

  const removeMarker = (markerId) => {
    if (!currentImage) return;
    updateCurrentImage({
      markers: currentImage.markers.filter(m => m.id !== markerId)
    });
  };

  const removeImage = (idx) => {
    const globalIdx = blockStart + idx;
    const newImages = allImages.filter((_, i) => i !== globalIdx);
    setAllImages(newImages);
    
    if (currentIndex >= blockImages.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setSelectedOption(null);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 1) {
      if (selectionMode === 'title') {
        updateCurrentImage({ title: selectedText });
      } else {
        const newOpt = addOption(selectedText);
        if (newOpt) {
          setSelectedOption(newOpt.id);
        }
      }
      selection.removeAllRanges();
    }
  };

  const markCurrentAsComplete = () => {
    if (!currentImage) return;
    updateCurrentImage({ isComplete: true });
  };

  const handleNextImage = () => {
    markCurrentAsComplete();
    setCurrentIndex(Math.min(blockImages.length - 1, currentIndex + 1));
    setSelectedOption(null);
    setHoveredOption(null);
  };

  const handlePrevImage = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setSelectedOption(null);
    setHoveredOption(null);
  };

  const handleSaveAll = () => {
    if (allImages.length === 0) return;

    // Filtrar solo opciones que tienen marcadores
    const questions = allImages.map(img => {
      const optionsWithMarkers = img.options.filter(o => 
        img.markers.some(m => m.optionId === o.id)
      );
      const title = img.title || optionsWithMarkers.map(o => o.text).join(', ');
      return {
        type: 'image',
        question: title,
        description: img.description || '',
        imageUrl: img.url,
        options: optionsWithMarkers.map(o => ({
          ...o,
          markers: img.markers.filter(m => m.optionId === o.id)
        }))
      };
    }).filter(q => q.options.length > 0);

    if (questions.length === 1) {
      onSave(questions[0]);
    } else {
      onSave({ multipleQuestions: questions });
    }
    clearDraft();
  };

  const handleCancel = () => {
    clearDraft();
    onCancel();
  };

  const getOptionColor = (optionId) => {
    if (!currentImage) return COLORS[0];
    const index = currentImage.options.findIndex(o => o.id === optionId);
    return COLORS[index % COLORS.length];
  };

  const getOptionIndex = (optionId) => {
    if (!currentImage) return -1;
    return currentImage.options.findIndex(o => o.id === optionId);
  };

  const isImageComplete = (img) => {
    return img.isComplete || (img.options.length > 0 && img.markers.length > 0);
  };

  // Renderizar descripción con opciones vinculadas coloreadas
  const renderDescription = () => {
    if (!currentImage || !currentImage.description) return null;
    
    let text = currentImage.description;
    const parts = [];
    let lastIndex = 0;
    
    // Encontrar todas las opciones en el texto
    const matches = [];
    currentImage.options.forEach(opt => {
      const regex = new RegExp(opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, option: opt, text: match[0] });
      }
    });
    
    // Ordenar por posición
    matches.sort((a, b) => a.start - b.start);
    
    // Eliminar solapamientos
    const filteredMatches = [];
    matches.forEach(m => {
      if (filteredMatches.length === 0 || m.start >= filteredMatches[filteredMatches.length - 1].end) {
        filteredMatches.push(m);
      }
    });
    
    // Construir partes
    filteredMatches.forEach(match => {
      if (match.start > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.start) });
      }
      parts.push({ type: 'option', content: match.text, option: match.option });
      lastIndex = match.end;
    });
    
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }
    
    return parts.map((part, idx) => {
      if (part.type === 'text') {
        return <span key={idx}>{part.content}</span>;
      }
      const color = getOptionColor(part.option.id);
      const isHovered = hoveredOption === part.option.id;
      return (
        <span
          key={idx}
          className="px-1 rounded cursor-pointer transition-all"
          style={{ 
            backgroundColor: isHovered ? `${color}40` : `${color}20`,
            borderBottom: `2px solid ${color}`,
            fontWeight: isHovered ? '600' : '500'
          }}
          onMouseEnter={() => setHoveredOption(part.option.id)}
          onMouseLeave={() => setHoveredOption(null)}
          onClick={() => setSelectedOption(part.option.id)}
        >
          {part.content}
        </span>
      );
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Crear Preguntas con Imagen</span>
          {allImages.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {allImages.filter(isImageComplete).length}/{allImages.length} completas
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload */}
        <label className="flex items-center justify-center gap-2 w-full h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors bg-gray-50">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-500">
            {isUploading ? 'Subiendo...' : 'Subir imágenes (se procesan en bloques de 10)'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultipleImageUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>

        {/* Navegación de bloques */}
        {totalBlocks > 1 && (
          <div className="flex items-center justify-center gap-2 py-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentBlock(currentBlock - 1); setCurrentIndex(0); }}
              disabled={currentBlock === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Bloque {currentBlock + 1} de {totalBlocks}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentBlock(currentBlock + 1); setCurrentIndex(0); }}
              disabled={currentBlock >= totalBlocks - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Miniaturas del bloque actual */}
        {blockImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2 px-1">
            {blockImages.map((img, idx) => (
              <div
                key={idx}
                className={`relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105' : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => { markCurrentAsComplete(); setCurrentIndex(idx); setSelectedOption(null); setHoveredOption(null); }}
              >
                <img src={img.url} alt="" className="w-16 h-16 object-cover" />
                {isImageComplete(img) && (
                  <div className="absolute top-0.5 right-0.5 bg-green-500 rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <button
                  className="absolute top-0.5 left-0.5 bg-red-500/80 rounded-full p-0.5 opacity-0 hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Editor de imagen actual */}
        {currentImage && (
          <>
            {/* Imagen con marcadores */}
            <div className="relative border rounded-lg overflow-hidden bg-gray-100">
              <div 
                className={`relative ${selectedOption ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleImageClick}
              >
                <img
                  ref={imageRef}
                  src={currentImage.url}
                  alt="Quiz"
                  className="w-full h-auto max-h-[400px] object-contain mx-auto"
                />
                {currentImage.markers.map((marker) => {
                  const isHighlighted = hoveredOption === marker.optionId || selectedOption === marker.optionId;
                  return (
                    <div
                      key={marker.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all ${isHighlighted ? 'scale-125 z-10' : ''}`}
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      {marker.type === 'circle' ? (
                        <div 
                          className={`w-8 h-8 rounded-full border-4 ${isHighlighted ? 'animate-pulse' : ''}`}
                          style={{ borderColor: getOptionColor(marker.optionId), boxShadow: isHighlighted ? `0 0 12px ${getOptionColor(marker.optionId)}` : 'none' }}
                        />
                      ) : (
                        <ArrowRight 
                          className={`w-6 h-6 ${isHighlighted ? 'animate-pulse' : ''}`}
                          style={{ color: getOptionColor(marker.optionId), filter: isHighlighted ? `drop-shadow(0 0 6px ${getOptionColor(marker.optionId)})` : 'none' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Título personalizado */}
            {currentImage.title && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <span className="text-xs text-green-700">Título:</span>
                <span className="text-sm font-medium text-green-800">{currentImage.title}</span>
                <button onClick={() => updateCurrentImage({ title: '' })} className="ml-auto text-green-600 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Descripción - seleccionar texto para crear opciones o título */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-gray-600">Descripción (selecciona texto)</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={selectionMode === 'option' ? 'default' : 'outline'}
                    onClick={() => setSelectionMode('option')}
                    className="h-6 text-xs px-2"
                  >
                    + Opción
                  </Button>
                  <Button
                    size="sm"
                    variant={selectionMode === 'title' ? 'default' : 'outline'}
                    onClick={() => setSelectionMode('title')}
                    className="h-6 text-xs px-2"
                  >
                    = Título
                  </Button>
                </div>
              </div>
              <div className="relative">
                <textarea
                  ref={descriptionRef}
                  value={currentImage.description || ''}
                  onChange={(e) => updateCurrentImage({ description: e.target.value })}
                  onMouseUp={handleTextSelection}
                  placeholder="Escribe la descripción y selecciona fragmentos para convertirlos en elementos a identificar..."
                  className="w-full p-3 border rounded-lg text-sm min-h-[80px] resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
              {currentImage.description && currentImage.options.length > 0 && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm leading-relaxed">
                  {renderDescription()}
                </div>
              )}
            </div>

            {/* Agregar opción manual */}
            <div>
              <Label className="text-xs text-gray-600">Agregar opción manualmente</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Ej: Hueso frontal"
                  onKeyPress={(e) => e.key === 'Enter' && addOption()}
                  className="text-sm"
                />
                <Button onClick={() => addOption()} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Opciones para colocar marcadores */}
            {currentImage.options.length > 0 && (
              <div>
                <Label className="text-xs text-gray-600">Opciones (clic para seleccionar y colocar marcador en imagen)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentImage.options.map((option) => {
                    const hasMarker = currentImage.markers.some(m => m.optionId === option.id);
                    const isSelected = selectedOption === option.id;
                    const isHovered = hoveredOption === option.id;
                    const color = getOptionColor(option.id);
                    
                    return (
                      <Badge
                        key={option.id}
                        variant="outline"
                        className={`px-2 py-1.5 cursor-pointer transition-all text-xs ${
                          isSelected ? 'ring-2 ring-offset-1' : ''
                        }`}
                        style={{ 
                          borderColor: color,
                          backgroundColor: (isSelected || isHovered) ? `${color}20` : 'white',
                          boxShadow: isSelected ? `0 0 8px ${color}50` : 'none'
                        }}
                        onClick={() => setSelectedOption(isSelected ? null : option.id)}
                        onMouseEnter={() => setHoveredOption(option.id)}
                        onMouseLeave={() => setHoveredOption(null)}
                      >
                        {hasMarker && <Check className="w-3 h-3 mr-1" style={{ color }} />}
                        {option.text}
                        <button
                          className="ml-1.5 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); removeOption(option.id); }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>

                {/* Tipo de marcador cuando hay opción seleccionada */}
                {selectedOption && (
                  <div className="flex items-center gap-2 mt-3 p-2 bg-indigo-50 rounded-lg">
                    <span className="text-xs text-indigo-700">Marcador:</span>
                    <Button
                      size="sm"
                      variant={markerType === 'circle' ? 'default' : 'outline'}
                      onClick={() => setMarkerType('circle')}
                      className="h-7 text-xs"
                    >
                      <Circle className="w-3 h-3 mr-1" />
                      Círculo
                    </Button>
                    <Button
                      size="sm"
                      variant={markerType === 'arrow' ? 'default' : 'outline'}
                      onClick={() => setMarkerType('arrow')}
                      className="h-7 text-xs"
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Flecha
                    </Button>
                    <span className="text-xs text-indigo-600 ml-2">
                      → Haz clic en la imagen
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Marcadores agregados */}
            {currentImage.markers.length > 0 && (
              <div>
                <Label className="text-xs text-gray-600">Marcadores ({currentImage.markers.length})</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentImage.markers.map((marker) => {
                    const option = currentImage.options.find(o => o.id === marker.optionId);
                    const color = getOptionColor(marker.optionId);
                    return (
                      <Badge 
                        key={marker.id}
                        variant="outline"
                        className="text-xs py-0.5 cursor-pointer hover:bg-gray-100"
                        style={{ borderColor: color }}
                        onMouseEnter={() => setHoveredOption(marker.optionId)}
                        onMouseLeave={() => setHoveredOption(null)}
                      >
                        <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: color }} />
                        {option?.text?.substring(0, 15)}{option?.text?.length > 15 ? '...' : ''}
                        <button onClick={() => removeMarker(marker.id)} className="ml-1 hover:text-red-600">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2 border-t">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveAll} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            disabled={allImages.length === 0 || !allImages.some(img => img.options.length > 0)}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar {allImages.length > 1 ? `${allImages.length} Preguntas` : 'Pregunta'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
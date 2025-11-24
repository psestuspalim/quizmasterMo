import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Trash2, Circle, ArrowRight, Save, X, ChevronLeft, ChevronRight, Image, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImageQuizCreator({ onSave, onCancel }) {
  const [images, setImages] = useState([]); // [{url, file, options, markers, description}]
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newOption, setNewOption] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [markerType, setMarkerType] = useState('circle');
  const [isUploading, setIsUploading] = useState(false);
  const imageRef = useRef(null);

  const currentImage = images[currentIndex];

  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedImages = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Extraer opciones del nombre del archivo
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
      setImages([...images, ...uploadedImages]);
      if (images.length === 0) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    }
    setIsUploading(false);
  };

  const updateCurrentImage = (updates) => {
    const newImages = [...images];
    newImages[currentIndex] = { ...newImages[currentIndex], ...updates };
    setImages(newImages);
  };

  const addOption = () => {
    if (!currentImage || !newOption.trim()) return;
    if (currentImage.options.find(o => o.text === newOption.trim())) return;
    
    updateCurrentImage({
      options: [...currentImage.options, { 
        id: Date.now().toString(),
        text: newOption.trim(), 
        isCorrect: true 
      }]
    });
    setNewOption('');
  };

  const removeOption = (id) => {
    if (!currentImage) return;
    updateCurrentImage({
      options: currentImage.options.filter(o => o.id !== id),
      markers: currentImage.markers.filter(m => m.optionId !== id)
    });
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
      y,
      endX: markerType === 'arrow' ? x + 5 : undefined,
      endY: markerType === 'arrow' ? y + 5 : undefined
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

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (currentIndex >= newImages.length && newImages.length > 0) {
      setCurrentIndex(newImages.length - 1);
    }
    setSelectedOption(null);
  };

  const handleSaveAll = () => {
    if (images.length === 0) return;

    const questions = images.map(img => {
      const title = img.options.map(o => o.text).join(', ');
      return {
        type: 'image',
        question: title,
        description: img.description || '',
        imageUrl: img.url,
        options: img.options.map(o => ({
          ...o,
          markers: img.markers.filter(m => m.optionId === o.id)
        }))
      };
    });

    // Si hay una sola imagen, guardar como antes
    if (questions.length === 1) {
      onSave(questions[0]);
    } else {
      // Si hay múltiples, crear múltiples preguntas
      onSave({ multipleQuestions: questions });
    }
  };

  const getOptionColor = (optionId) => {
    if (!currentImage) return '#ef4444';
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
    const index = currentImage.options.findIndex(o => o.id === optionId);
    return colors[index % colors.length];
  };

  const isImageComplete = (img) => {
    return img.options.length > 0 && img.options.every(o => 
      img.markers.some(m => m.optionId === o.id)
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Crear Preguntas con Imagen</span>
          {images.length > 0 && (
            <Badge variant="outline">
              {images.filter(isImageComplete).length}/{images.length} completas
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subir múltiples imágenes */}
        <div>
          <Label>Imágenes</Label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors mt-2">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">
              {isUploading ? 'Subiendo...' : 'Haz clic para subir una o más imágenes'}
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
        </div>

        {/* Miniaturas de imágenes */}
        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-gray-200'
                }`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setSelectedOption(null);
                }}
              >
                <img src={img.url} alt="" className="w-20 h-20 object-cover" />
                {isImageComplete(img) && (
                  <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <button
                  className="absolute top-1 left-1 bg-red-500 rounded-full p-0.5 opacity-0 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor de imagen actual */}
        {currentImage && (
          <>
            {/* Navegación */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentIndex(Math.max(0, currentIndex - 1));
                  setSelectedOption(null);
                }}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Imagen {currentIndex + 1} de {images.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentIndex(Math.min(images.length - 1, currentIndex + 1));
                  setSelectedOption(null);
                }}
                disabled={currentIndex === images.length - 1}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Descripción */}
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={currentImage.description || ''}
                onChange={(e) => updateCurrentImage({ description: e.target.value })}
                placeholder="Añade una descripción o instrucciones para esta imagen..."
                className="mt-1"
              />
            </div>

            {/* Imagen con marcadores */}
            <div className="relative">
              <div 
                className="relative cursor-crosshair border rounded-lg overflow-hidden"
                onClick={handleImageClick}
              >
                <img
                  ref={imageRef}
                  src={currentImage.url}
                  alt="Quiz"
                  className="w-full h-auto"
                />
                {currentImage.markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  >
                    {marker.type === 'circle' ? (
                      <div 
                        className="w-10 h-10 rounded-full border-4 animate-pulse"
                        style={{ borderColor: getOptionColor(marker.optionId) }}
                      />
                    ) : (
                      <ArrowRight 
                        className="w-8 h-8"
                        style={{ color: getOptionColor(marker.optionId) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones */}
            <div>
              <Label>Opciones (elementos a identificar)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Ej: Hueso frontal"
                  onKeyPress={(e) => e.key === 'Enter' && addOption()}
                />
                <Button onClick={addOption}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {currentImage.options.map((option) => {
                  const hasMarker = currentImage.markers.some(m => m.optionId === option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant="outline"
                      className={`px-3 py-2 cursor-pointer transition-all ${
                        selectedOption === option.id 
                          ? 'ring-2 ring-offset-2' 
                          : ''
                      } ${hasMarker ? 'opacity-100' : 'opacity-60'}`}
                      style={{ 
                        borderColor: getOptionColor(option.id),
                        backgroundColor: selectedOption === option.id ? `${getOptionColor(option.id)}20` : undefined
                      }}
                      onClick={() => setSelectedOption(selectedOption === option.id ? null : option.id)}
                    >
                      {hasMarker && <Check className="w-3 h-3 mr-1" />}
                      {option.text}
                      <button
                        className="ml-2 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOption(option.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Tipo de marcador */}
            {selectedOption && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-indigo-800 mb-3">
                  Haz clic en la imagen para agregar marcadores para: <strong>{currentImage.options.find(o => o.id === selectedOption)?.text}</strong>
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={markerType === 'circle' ? 'default' : 'outline'}
                    onClick={() => setMarkerType('circle')}
                  >
                    <Circle className="w-4 h-4 mr-1" />
                    Círculo
                  </Button>
                  <Button
                    size="sm"
                    variant={markerType === 'arrow' ? 'default' : 'outline'}
                    onClick={() => setMarkerType('arrow')}
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    Flecha
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de marcadores */}
            {currentImage.markers.length > 0 && (
              <div>
                <Label>Marcadores agregados</Label>
                <div className="space-y-1 mt-2">
                  {currentImage.markers.map((marker) => {
                    const option = currentImage.options.find(o => o.id === marker.optionId);
                    return (
                      <div 
                        key={marker.id}
                        className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                      >
                        <span>
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getOptionColor(marker.optionId) }}
                          />
                          {option?.text} - {marker.type === 'circle' ? 'Círculo' : 'Flecha'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMarker(marker.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveAll} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            disabled={images.length === 0 || !images.some(img => img.options.length > 0)}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar {images.length > 1 ? `${images.length} Preguntas` : 'Pregunta'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
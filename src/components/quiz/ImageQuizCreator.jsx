import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Trash2, Circle, ArrowRight, Save, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImageQuizCreator({ onSave, onCancel }) {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [markers, setMarkers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [markerType, setMarkerType] = useState('circle'); // 'circle' or 'arrow'
  const [isUploading, setIsUploading] = useState(false);
  const imageRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      setImage(file);

      // Extraer opciones del nombre del archivo
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Quitar extensión
      const elements = fileName.split(',').map(el => el.trim()).filter(el => el);
      const newOptions = elements.map(text => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text,
        isCorrect: true
      }));
      setOptions(newOptions);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    setIsUploading(false);
  };

  const addOption = () => {
    if (newOption.trim() && !options.find(o => o.text === newOption.trim())) {
      setOptions([...options, { 
        id: Date.now().toString(),
        text: newOption.trim(), 
        isCorrect: true 
      }]);
      setNewOption('');
    }
  };

  const removeOption = (id) => {
    setOptions(options.filter(o => o.id !== id));
    setMarkers(markers.filter(m => m.optionId !== id));
  };

  const handleImageClick = (e) => {
    if (!selectedOption || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker = {
      id: Date.now().toString(),
      optionId: selectedOption,
      type: markerType,
      x,
      y,
      // Para flechas, punto final
      endX: markerType === 'arrow' ? x + 5 : undefined,
      endY: markerType === 'arrow' ? y + 5 : undefined
    };

    setMarkers([...markers, newMarker]);
  };

  const removeMarker = (markerId) => {
    setMarkers(markers.filter(m => m.id !== markerId));
  };

  const handleSave = () => {
    if (!imageUrl || options.length === 0) return;

    // Generar título automático con los nombres de las opciones
    const title = options.map(o => o.text).join(', ');

    const questionData = {
      type: 'image',
      question: title,
      imageUrl,
      options: options.map(o => ({
        ...o,
        markers: markers.filter(m => m.optionId === o.id)
      }))
    };

    onSave(questionData);
  };

  const getOptionColor = (optionId) => {
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
    const index = options.findIndex(o => o.id === optionId);
    return colors[index % colors.length];
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Crear Pregunta con Imagen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subir imagen */}
        <div>
          <Label>Imagen</Label>
          {!imageUrl ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">
                {isUploading ? 'Subiendo...' : 'Haz clic para subir una imagen'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          ) : (
            <div className="relative">
              <div 
                className="relative cursor-crosshair border rounded-lg overflow-hidden"
                onClick={handleImageClick}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Quiz"
                  className="w-full h-auto"
                />
                {/* Renderizar marcadores */}
                {markers.map((marker) => (
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
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setImageUrl('');
                  setMarkers([]);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
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
            {options.map((option) => (
              <Badge
                key={option.id}
                variant="outline"
                className={`px-3 py-2 cursor-pointer transition-all ${
                  selectedOption === option.id 
                    ? 'ring-2 ring-offset-2' 
                    : ''
                }`}
                style={{ 
                  borderColor: getOptionColor(option.id),
                  backgroundColor: selectedOption === option.id ? `${getOptionColor(option.id)}20` : undefined
                }}
                onClick={() => setSelectedOption(selectedOption === option.id ? null : option.id)}
              >
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
            ))}
          </div>
        </div>

        {/* Tipo de marcador */}
        {selectedOption && imageUrl && (
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-indigo-800 mb-3">
              Haz clic en la imagen para agregar marcadores para: <strong>{options.find(o => o.id === selectedOption)?.text}</strong>
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
        {markers.length > 0 && (
          <div>
            <Label>Marcadores agregados</Label>
            <div className="space-y-1 mt-2">
              {markers.map((marker) => {
                const option = options.find(o => o.id === marker.optionId);
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

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            disabled={!imageUrl || options.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Pregunta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
'use client'

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X, Image, Loader2 } from 'lucide-react';

export default function ImageUpload({ 
  storeId, 
  currentImages = [], 
  onImagesChange,
  maxImages = 5,
  className = "" 
}) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(currentImages);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Please select only image files (JPEG, PNG, WebP, GIF)');
      return;
    }

    // Check file sizes (max 5MB per file)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Please select images smaller than 5MB');
      return;
    }

    uploadImages(files);
  };

  const uploadImages = async (files) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/upload/${storeId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newImages = [...images, ...result.images];
        setImages(newImages);
        onImagesChange(newImages.map(img => img.url));
        toast.success(`${result.images.length} image(s) uploaded successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages.map(img => img.url));
    toast.success('Image removed');
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Upload Area */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="text-center">
                {uploading ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading images...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={triggerFileSelect}
                        disabled={images.length >= maxImages}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        {images.length === 0 ? 'Upload Images' : 'Add More Images'}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Click to upload or drag and drop</p>
                      <p>Max {maxImages} images • JPEG, PNG, WebP, GIF • Max 5MB each</p>
                      <p>{images.length} / {maxImages} images uploaded</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-square relative">
                      <img
                        src={image.url}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {index === 0 && (
                  <div className="absolute -top-2 -left-2">
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      Main
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Drag and Drop Hint */}
        {images.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            <p>No images uploaded yet. Add some images to make your product stand out!</p>
          </div>
        )}
      </div>
    </div>
  );
}
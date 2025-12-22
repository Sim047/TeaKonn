// frontend/src/components/ImageUpload.tsx
import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader } from "lucide-react";
import axios from "axios";
import { API_URL } from "../config/api";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  token: string;
}

export default function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 1,
  token 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots === 0) {
      alert(`Maximum ${maxImages} image(s) allowed`);
      return;
    }

    setUploading(true);

    try {
      if (maxImages === 1) {
        // Single image upload
        const formData = new FormData();
        formData.append("file", files[0]);

        const response = await axios.post(`${API_URL}/files/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        onImagesChange([response.data.url]);
      } else {
        // Multiple image upload
        const formData = new FormData();
        const filesToUpload = Array.from(files).slice(0, remainingSlots);
        
        filesToUpload.forEach((file) => {
          formData.append("files", file);
        });

        const response = await axios.post(`${API_URL}/files/upload-multiple`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        onImagesChange([...images, ...response.data.urls]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image(s)");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Upload Button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxImages > 1}
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading
                ? "border-gray-400 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                : "border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10"
            }`}
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 text-purple-500 animate-spin" />
                <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {images.length === 0 ? "Upload Image" : `Add Image (${images.length}/${maxImages})`}
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className={`mt-4 grid gap-3 ${maxImages > 1 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1"}`}>
          {images.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreviewImage(url)}
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
              {maxImages > 1 && index === 0 && (
                <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

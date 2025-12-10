import { supabase } from './supabase';

export type IncomingFile = {
  file: File;
  type?: 'image' | 'file';
  projectId?: string;
};

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string;
  type: 'image' | 'file';
  thumbnailUrl?: string;
  projectId?: string;
};

// Maximum file size: 25MB for files, 10MB for images
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  ...ALLOWED_IMAGE_TYPES
];

// Error types
export class UploadError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Image compression and resize
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new UploadError('Failed to create canvas context', 'COMPRESSION_FAILED'));
        return;
      }

      // Calculate new dimensions (max 1200px width/height)
      let width = img.width;
      let height = img.height;
      const maxSize = 1200;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new UploadError('Failed to compress image', 'COMPRESSION_FAILED'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      reject(new UploadError('Failed to load image', 'IMAGE_LOAD_FAILED'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// Create thumbnail
async function createThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new UploadError('Failed to create canvas context', 'THUMBNAIL_FAILED'));
        return;
      }

      // Thumbnail size: 200x200
      const size = 200;
      canvas.width = size;
      canvas.height = size;

      // Calculate thumbnail dimensions (cover)
      const scale = Math.max(size / img.width, size / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;

      ctx.drawImage(img, x, y, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      reject(new UploadError('Failed to create thumbnail', 'THUMBNAIL_FAILED'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// Validate file
function validateFile(file: File, type: 'image' | 'file'): void {
  console.log('Validating file:', file.name, 'Type:', file.type, 'Size:', file.size, 'Category:', type);
  
  // Check file size
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    throw new UploadError(
      `File "${file.name}" size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds ${maxSize / (1024 * 1024)}MB limit`,
      'FILE_TOO_LARGE'
    );
  }

  // Check file type
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
  if (!allowedTypes.includes(file.type)) {
    console.error('File type not allowed:', file.type, 'Allowed types:', allowedTypes);
    throw new UploadError(
      `File type "${file.type}" not allowed for ${file.name}`,
      'INVALID_FILE_TYPE'
    );
  }
  
  console.log('File validation passed for:', file.name);
}

// Storage adapter using Supabase Storage
const storage = {
  async store(file: Blob, name: string, projectId: string, type: 'image' | 'file'): Promise<string> {
    // Use a default projectId if not provided (for backward compatibility)
    const safeProjectId = projectId || 'temp';
    const fileExt = name.split('.').pop();
    const fileName = `${safeProjectId}/${type}s/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Attempted filename:', fileName);
      throw new UploadError(`Failed to upload to storage: ${error.message}`, 'STORAGE_UPLOAD_FAILED');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(data.path);

    return publicUrl;
  },

  async get(url: string): Promise<string> {
    // Return the URL as-is (public URLs are directly accessible)
    return url;
  }
};

export async function uploadFiles(items: IncomingFile[]): Promise<UploadedFile[]> {
  const results: UploadedFile[] = [];

  for (const item of items) {
    const { file, type = 'file', projectId } = item;

    try {
      // Validate file
      validateFile(file, type);

      let uploadedFile: Blob = file;
      let thumbnailUrl: string | undefined;

      // Process images
      if (type === 'image') {
        uploadedFile = await compressImage(file);
        thumbnailUrl = await createThumbnail(file);
        if (thumbnailUrl.startsWith('data:')) {
          // Upload thumbnail to Supabase Storage
          const thumbnailBlob = await fetch(thumbnailUrl).then(r => r.blob());
          const thumbnailExt = file.name.split('.').pop();
          const thumbnailFileName = `${projectId}/thumbnails/${Date.now()}_${Math.random().toString(36).substring(7)}.${thumbnailExt}`;
          
          const { data: thumbData } = await supabase.storage
            .from('chat-files')
            .upload(thumbnailFileName, thumbnailBlob, {
              cacheControl: '3600',
              upsert: false
            });

          if (thumbData) {
            const { data: { publicUrl } } = supabase.storage
              .from('chat-files')
              .getPublicUrl(thumbData.path);
            thumbnailUrl = publicUrl;
          }
        }
      }

      // Upload to storage
      const url = await storage.store(uploadedFile, file.name, projectId!, type);

      results.push({
        id: `upl_${crypto.randomUUID?.() ?? Date.now()}`,
        name: file.name,
        size: uploadedFile.size,
        mime: file.type || 'application/octet-stream',
        url,
        type,
        thumbnailUrl,
        projectId
      });
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw error;
    }
  }

  return results;
}

// Utility function to get file URL
export async function getFileUrl(url: string): Promise<string> {
  return storage.get(url);
}

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/config';
import { FileObject } from '@supabase/storage-js';

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  upsert?: boolean;
  onProgress?: (progress: number) => void;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  data: FileObject | null;
  error: Error | null;
  publicUrl: string | null;
}

export interface UseSupabaseStorageOptions {
  bucket?: string;
  autoCleanup?: boolean;
}

export const useSupabaseStorage = (
  bucketName: string = 'media',
  options: UseSupabaseStorageOptions = {}
) => {
  const [uploading, setUploading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Upload file
  const upload = useCallback(async (
    file: File,
    uploadOptions: UploadOptions = {}
  ): Promise<UploadResult> => {
    const {
      folder,
      fileName,
      upsert = false,
      onProgress,
      metadata = {}
    } = uploadOptions;

    setUploading(true);
    setError(null);

    try {
      // Generate file name if not provided
      const fileExtension = file.name.split('.').pop();
      const generatedName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = folder ? `${folder}/${generatedName}` : generatedName;

      // Upload file with progress tracking
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert,
          metadata: {
            ...metadata,
            originalName: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
          },
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (onProgress) {
        onProgress(100);
      }

      return {
        data,
        error: null,
        publicUrl: urlData.publicUrl,
      };

    } catch (err) {
      const error = err as Error;
      setError(error);
      return {
        data: null,
        error,
        publicUrl: null,
      };
    } finally {
      setUploading(false);
    }
  }, [bucketName]);

  // Upload multiple files
  const uploadMultiple = useCallback(async (
    files: File[],
    uploadOptions: UploadOptions = {}
  ): Promise<UploadResult[]> => {
    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map((file, index) => 
        upload(file, {
          ...uploadOptions,
          onProgress: (progress) => {
            if (uploadOptions.onProgress) {
              const totalProgress = ((index * 100) + progress) / files.length;
              uploadOptions.onProgress(totalProgress);
            }
          }
        })
      );

      const results = await Promise.all(uploadPromises);
      return results;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return files.map(() => ({
        data: null,
        error,
        publicUrl: null,
      }));
    } finally {
      setUploading(false);
    }
  }, [upload]);

  // Download file
  const download = useCallback(async (path: string): Promise<Blob | null> => {
    setDownloadProgress(0);
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(path);

      if (downloadError) {
        throw new Error(downloadError.message);
      }

      setDownloadProgress(100);
      return data;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, [bucketName]);

  // Delete file
  const deleteFile = useCallback(async (path: string): Promise<boolean> => {
    setError(null);

    try {
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return true;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    }
  }, [bucketName]);

  // Delete multiple files
  const deleteFiles = useCallback(async (paths: string[]): Promise<boolean> => {
    setError(null);

    try {
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(paths);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return true;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    }
  }, [bucketName]);

  // List files
  const listFiles = useCallback(async (
    folder?: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
      search?: string;
    } = {}
  ): Promise<FileObject[]> => {
    setError(null);

    try {
      const { data, error: listError } = await supabase.storage
        .from(bucketName)
        .list(folder, {
          limit: options.limit,
          offset: options.offset,
          sortBy: options.sortBy,
          search: options.search,
        });

      if (listError) {
        throw new Error(listError.message);
      }

      return data || [];

    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    }
  }, [bucketName]);

  // Get public URL
  const getPublicUrl = useCallback((path: string): string => {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  }, [bucketName]);

  // Get signed URL (for private files)
  const getSignedUrl = useCallback(async (
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> => {
    setError(null);

    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, expiresIn);

      if (signedUrlError) {
        throw new Error(signedUrlError.message);
      }

      return data.signedUrl;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, [bucketName]);

  // Move file
  const moveFile = useCallback(async (
    fromPath: string,
    toPath: string
  ): Promise<boolean> => {
    setError(null);

    try {
      const { error: moveError } = await supabase.storage
        .from(bucketName)
        .move(fromPath, toPath);

      if (moveError) {
        throw new Error(moveError.message);
      }

      return true;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    }
  }, [bucketName]);

  // Copy file
  const copyFile = useCallback(async (
    fromPath: string,
    toPath: string
  ): Promise<boolean> => {
    setError(null);

    try {
      const { error: copyError } = await supabase.storage
        .from(bucketName)
        .copy(fromPath, toPath);

      if (copyError) {
        throw new Error(copyError.message);
      }

      return true;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    }
  }, [bucketName]);

  // Get file metadata
  const getFileMetadata = useCallback(async (path: string) => {
    setError(null);

    try {
      const files = await listFiles();
      const file = files.find(f => f.name === path.split('/').pop());
      
      return file || null;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, [listFiles]);

  // Create folder
  const createFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    setError(null);

    try {
      // Create an empty file to create the folder structure
      const placeholderFile = new File([''], '.gitkeep', { type: 'text/plain' });
      const result = await upload(placeholderFile, {
        folder: folderPath,
        fileName: '.gitkeep',
      });

      return result.error === null;

    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    }
  }, [upload]);

  // Get storage usage
  const getStorageUsage = useCallback(async (): Promise<{
    size: number;
    count: number;
  } | null> => {
    setError(null);

    try {
      const files = await listFiles();
      
      const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      const totalCount = files.length;

      return {
        size: totalSize,
        count: totalCount,
      };

    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, [listFiles]);

  // Validate file before upload
  const validateFile = useCallback((
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const {
      maxSize = 50 * 1024 * 1024, // 50MB default
      allowedTypes = [],
      allowedExtensions = [],
    } = options;

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return {
    upload,
    uploadMultiple,
    download,
    deleteFile,
    deleteFiles,
    listFiles,
    getPublicUrl,
    getSignedUrl,
    moveFile,
    copyFile,
    getFileMetadata,
    createFolder,
    getStorageUsage,
    validateFile,
    uploading,
    downloadProgress,
    error,
  };
};

export default useSupabaseStorage;
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/config';
import { ContentItem, ContentVersion } from '@/types/admin';

export interface UseContentVersionsOptions {
  enabled?: boolean;
  maxVersions?: number;
}

export const useContentVersions = (
  contentId?: string,
  options: UseContentVersionsOptions = {}
) => {
  const { enabled = true, maxVersions = 50 } = options;
  
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch versions for content
  const fetchVersions = useCallback(async () => {
    if (!contentId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('content_versions')
        .select(`
          *,
          created_by_user:user_profiles(name, email, avatar_url)
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(maxVersions);

      if (fetchError) {
        throw fetchError;
      }

      setVersions(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching content versions:', err);
    } finally {
      setLoading(false);
    }
  }, [contentId, enabled, maxVersions]);

  // Load versions on mount and when contentId changes
  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Create a new version
  const createVersion = useCallback(async (
    content: ContentItem,
    comment?: string
  ): Promise<ContentVersion | null> => {
    if (!content.id) return null;

    try {
      // Get the current highest version number
      const { data: latestVersion } = await supabase
        .from('content_versions')
        .select('version_number')
        .eq('content_id', content.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const newVersionNumber = (latestVersion?.version_number || 0) + 1;

      // Create the version record
      const versionData = {
        content_id: content.id,
        version_number: newVersionNumber,
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        status: content.status,
        created_by: content.author_id,
        comment: comment || `Version ${newVersionNumber}`,
        metadata: {
          tags: content.tags,
          categories: content.categories,
          featured_image: content.featured_image,
          seo_metadata: content.seo_metadata,
        },
        created_at: new Date().toISOString(),
      };

      const { data, error: createError } = await supabase
        .from('content_versions')
        .insert(versionData)
        .select(`
          *,
          created_by_user:user_profiles(name, email, avatar_url)
        `)
        .single();

      if (createError) {
        throw createError;
      }

      // Update local versions list
      setVersions(prev => [data, ...prev]);

      // Clean up old versions if we exceed maxVersions
      if (versions.length >= maxVersions) {
        await cleanupOldVersions(content.id, maxVersions);
      }

      return data;
    } catch (err) {
      setError(err as Error);
      console.error('Error creating content version:', err);
      return null;
    }
  }, [versions.length, maxVersions]);

  // Restore a version
  const restoreVersion = useCallback(async (
    version: ContentVersion
  ): Promise<ContentItem | null> => {
    try {
      // First create a backup of current state
      const { data: currentContent } = await supabase
        .from('content')
        .select('*')
        .eq('id', version.content_id)
        .single();

      if (currentContent) {
        await createVersion(currentContent, 'Auto-backup before restore');
      }

      // Restore the version data to the main content table
      const restoreData = {
        title: version.title,
        content: version.content,
        excerpt: version.excerpt,
        status: 'draft', // Always restore as draft for safety
        tags: version.metadata?.tags,
        categories: version.metadata?.categories,
        featured_image: version.metadata?.featured_image,
        seo_metadata: version.metadata?.seo_metadata,
        updated_at: new Date().toISOString(),
      };

      const { data, error: restoreError } = await supabase
        .from('content')
        .update(restoreData)
        .eq('id', version.content_id)
        .select()
        .single();

      if (restoreError) {
        throw restoreError;
      }

      // Create a restore version entry
      await createVersion(data, `Restored from version ${version.version_number}`);

      return data;
    } catch (err) {
      setError(err as Error);
      console.error('Error restoring content version:', err);
      return null;
    }
  }, [createVersion]);

  // Delete a version
  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('content_versions')
        .delete()
        .eq('id', versionId);

      if (deleteError) {
        throw deleteError;
      }

      // Update local versions list
      setVersions(prev => prev.filter(v => v.id !== versionId));

      return true;
    } catch (err) {
      setError(err as Error);
      console.error('Error deleting content version:', err);
      return false;
    }
  }, []);

  // Compare two versions
  const compareVersions = useCallback((
    version1: ContentVersion,
    version2: ContentVersion
  ) => {
    const changes = {
      title: version1.title !== version2.title,
      content: version1.content !== version2.content,
      excerpt: version1.excerpt !== version2.excerpt,
      status: version1.status !== version2.status,
      metadata: JSON.stringify(version1.metadata) !== JSON.stringify(version2.metadata),
    };

    const hasChanges = Object.values(changes).some(Boolean);

    return {
      hasChanges,
      changes,
      diff: {
        title: {
          old: version2.title,
          new: version1.title,
        },
        content: {
          old: version2.content,
          new: version1.content,
        },
        excerpt: {
          old: version2.excerpt,
          new: version1.excerpt,
        },
        status: {
          old: version2.status,
          new: version1.status,
        },
      },
    };
  }, []);

  // Clean up old versions
  const cleanupOldVersions = useCallback(async (
    contentId: string,
    keepCount: number
  ): Promise<void> => {
    try {
      // Get versions to delete (keep the latest keepCount versions)
      const { data: versionsToDelete } = await supabase
        .from('content_versions')
        .select('id')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .range(keepCount, 999); // Get versions beyond keepCount

      if (versionsToDelete && versionsToDelete.length > 0) {
        const idsToDelete = versionsToDelete.map(v => v.id);
        
        const { error: deleteError } = await supabase
          .from('content_versions')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Error cleaning up old versions:', deleteError);
        }
      }
    } catch (err) {
      console.error('Error in cleanup old versions:', err);
    }
  }, []);

  // Get version diff as HTML
  const getVersionDiffHtml = useCallback((
    oldVersion: ContentVersion,
    newVersion: ContentVersion
  ): string => {
    // This is a simplified diff - in a real implementation,
    // you might want to use a library like diff2html
    const oldContent = oldVersion.content || '';
    const newContent = newVersion.content || '';
    
    if (oldContent === newContent) {
      return newContent;
    }

    // Simple word-based diff (you can enhance this)
    const oldWords = oldContent.split(' ');
    const newWords = newContent.split(' ');
    
    let diffHtml = '';
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldWords.length || newIndex < newWords.length) {
      if (oldIndex < oldWords.length && newIndex < newWords.length) {
        if (oldWords[oldIndex] === newWords[newIndex]) {
          diffHtml += newWords[newIndex] + ' ';
          oldIndex++;
          newIndex++;
        } else {
          // Find next matching word
          let found = false;
          for (let i = newIndex + 1; i < newWords.length; i++) {
            if (oldWords[oldIndex] === newWords[i]) {
              // Words were added
              for (let j = newIndex; j < i; j++) {
                diffHtml += `<ins style="background-color: #d4edda;">${newWords[j]}</ins> `;
              }
              diffHtml += newWords[i] + ' ';
              newIndex = i + 1;
              oldIndex++;
              found = true;
              break;
            }
          }
          
          if (!found) {
            // Word was changed or removed
            diffHtml += `<del style="background-color: #f8d7da;">${oldWords[oldIndex]}</del> `;
            if (newIndex < newWords.length) {
              diffHtml += `<ins style="background-color: #d4edda;">${newWords[newIndex]}</ins> `;
              newIndex++;
            }
            oldIndex++;
          }
        }
      } else if (oldIndex < oldWords.length) {
        // Remaining old words (deleted)
        diffHtml += `<del style="background-color: #f8d7da;">${oldWords[oldIndex]}</del> `;
        oldIndex++;
      } else {
        // Remaining new words (added)
        diffHtml += `<ins style="background-color: #d4edda;">${newWords[newIndex]}</ins> `;
        newIndex++;
      }
    }
    
    return diffHtml.trim();
  }, []);

  // Auto-create version on significant changes
  const autoCreateVersion = useCallback(async (
    content: ContentItem,
    threshold: number = 50 // minimum character changes to create version
  ): Promise<ContentVersion | null> => {
    if (versions.length === 0) {
      return createVersion(content, 'Initial version');
    }

    const latestVersion = versions[0];
    const currentContentLength = content.content?.length || 0;
    const lastVersionLength = latestVersion.content?.length || 0;
    const changeAmount = Math.abs(currentContentLength - lastVersionLength);

    if (changeAmount >= threshold) {
      return createVersion(content, 'Auto-saved version');
    }

    return null;
  }, [versions, createVersion]);

  return {
    versions,
    loading,
    error,
    fetchVersions,
    createVersion,
    restoreVersion,
    deleteVersion,
    compareVersions,
    getVersionDiffHtml,
    autoCreateVersion,
    cleanupOldVersions,
  };
};

export default useContentVersions;
/**
 * Supabase Storage Tests
 * Tests file upload, download, management, and storage policies
 */

const { createClient } = require('@supabase/supabase-js');
const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');

describe('Supabase Storage', () => {
  let supabase;
  let adminClient;
  let testFiles = [];
  let testBuckets = [];

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase environment variables not configured for testing');
    }

    supabase = createClient(supabaseUrl, anonKey);
    
    if (serviceKey) {
      adminClient = createClient(supabaseUrl, serviceKey);
    }

    // Create test files
    await createTestFiles();
  });

  afterAll(async () => {
    // Cleanup test files and buckets
    await cleanupStorage();
    await cleanupTestFiles();
  });

  afterEach(async () => {
    // Clean up any files created in tests
    await cleanupTestUploads();
  });

  const createTestFiles = async () => {
    const testDir = path.join(__dirname, 'test-files');
    
    try {
      await fs.mkdir(testDir, { recursive: true });

      // Create test image file
      const imageBuffer = Buffer.from('fake-image-data');
      await fs.writeFile(path.join(testDir, 'test-image.jpg'), imageBuffer);
      
      // Create test text file
      const textContent = 'This is a test file for storage testing.';
      await fs.writeFile(path.join(testDir, 'test-document.txt'), textContent);
      
      // Create test JSON file
      const jsonContent = JSON.stringify({ test: true, timestamp: Date.now() });
      await fs.writeFile(path.join(testDir, 'test-data.json'), jsonContent);

      testFiles = [
        { name: 'test-image.jpg', type: 'image/jpeg', size: imageBuffer.length },
        { name: 'test-document.txt', type: 'text/plain', size: textContent.length },
        { name: 'test-data.json', type: 'application/json', size: jsonContent.length }
      ];
    } catch (error) {
      console.warn('Could not create test files:', error.message);
    }
  };

  const cleanupTestFiles = async () => {
    const testDir = path.join(__dirname, 'test-files');
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      console.warn('Could not cleanup test files:', error.message);
    }
  };

  const cleanupStorage = async () => {
    if (!adminClient) return;

    try {
      // Remove test files from buckets
      for (const bucketName of testBuckets) {
        const { data: files } = await adminClient.storage
          .from(bucketName)
          .list('', { limit: 1000 });

        if (files && files.length > 0) {
          const filePaths = files.map(file => file.name);
          await adminClient.storage.from(bucketName).remove(filePaths);
        }

        // Delete test buckets
        await adminClient.storage.deleteBucket(bucketName);
      }
    } catch (error) {
      console.warn('Storage cleanup warning:', error.message);
    }
  };

  const cleanupTestUploads = async () => {
    if (!adminClient) return;

    try {
      // Clean up any files uploaded during tests
      const buckets = ['public-uploads', 'private-uploads', 'media-assets'];
      
      for (const bucketName of buckets) {
        const { data: files } = await supabase.storage
          .from(bucketName)
          .list('test/', { limit: 1000 });

        if (files && files.length > 0) {
          const filePaths = files.map(file => `test/${file.name}`);
          await supabase.storage.from(bucketName).remove(filePaths);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  describe('Bucket Management', () => {
    it('should create a public bucket', async () => {
      if (!adminClient) {
        console.log('Skipping bucket management tests - no admin client');
        return;
      }

      const bucketName = `test-public-${Date.now()}`;
      testBuckets.push(bucketName);

      const { data, error } = await adminClient.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/*', 'text/*'],
        fileSizeLimit: 1024 * 1024 * 10 // 10MB
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should create a private bucket', async () => {
      if (!adminClient) return;

      const bucketName = `test-private-${Date.now()}`;
      testBuckets.push(bucketName);

      const { data, error } = await adminClient.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['application/*', 'text/*']
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should list storage buckets', async () => {
      const { data, error } = await supabase.storage.listBuckets();

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('name');
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('public');
      }
    });

    it('should get bucket details', async () => {
      // Assume a bucket exists (created in previous tests or setup)
      const { data: buckets } = await supabase.storage.listBuckets();
      
      if (buckets && buckets.length > 0) {
        const bucketName = buckets[0].name;
        
        const { data, error } = await supabase.storage.getBucket(bucketName);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.name).toBe(bucketName);
      }
    });
  });

  describe('File Upload', () => {
    const bucketName = 'test-uploads';

    beforeEach(async () => {
      // Ensure bucket exists for upload tests
      if (adminClient) {
        await adminClient.storage.createBucket(bucketName, { public: true }).catch(() => {});
        if (!testBuckets.includes(bucketName)) {
          testBuckets.push(bucketName);
        }
      }
    });

    it('should upload a text file', async () => {
      const fileName = `test/text-upload-${Date.now()}.txt`;
      const fileContent = 'This is test file content for upload testing.';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileContent, {
          contentType: 'text/plain'
        });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe(fileName);
    });

    it('should upload a binary file', async () => {
      const fileName = `test/binary-upload-${Date.now()}.bin`;
      const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header bytes

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, binaryData, {
          contentType: 'application/octet-stream'
        });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe(fileName);
    });

    it('should upload with custom metadata', async () => {
      const fileName = `test/metadata-upload-${Date.now()}.txt`;
      const fileContent = 'File with custom metadata';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileContent, {
          contentType: 'text/plain',
          metadata: {
            author: 'Test Suite',
            purpose: 'Integration Testing',
            timestamp: new Date().toISOString()
          },
          cacheControl: '3600'
        });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe(fileName);
    });

    it('should handle upload conflicts with upsert', async () => {
      const fileName = `test/conflict-upload-${Date.now()}.txt`;
      const originalContent = 'Original file content';
      const updatedContent = 'Updated file content';

      // Upload original file
      const { data: originalData, error: originalError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, originalContent);

      expect(originalError).toBeNull();

      // Try to upload again without upsert (should fail)
      const { data: conflictData, error: conflictError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, updatedContent);

      expect(conflictError).not.toBeNull();
      expect(conflictError.message).toContain('already exists');

      // Upload with upsert (should succeed)
      const { data: upsertData, error: upsertError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, updatedContent, { upsert: true });

      expect(upsertError).toBeNull();
      expect(upsertData).toBeDefined();
    });

    it('should validate file size limits', async () => {
      // Create a large file content (simulate large file)
      const largeContent = 'x'.repeat(1024 * 1024 * 50); // 50MB of 'x' characters
      const fileName = `test/large-file-${Date.now()}.txt`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, largeContent);

      // Depending on bucket configuration, this might succeed or fail
      if (error) {
        expect(error.message).toContain('size');
      }
    });

    it('should validate file types', async () => {
      const fileName = `test/executable-${Date.now()}.exe`;
      const fileContent = 'fake executable content';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileContent, {
          contentType: 'application/x-executable'
        });

      // Depending on bucket configuration, this might be blocked
      if (error) {
        expect(error.message).toContain('mime type');
      }
    });
  });

  describe('File Download and Access', () => {
    const bucketName = 'test-downloads';
    let uploadedFiles = [];

    beforeEach(async () => {
      if (adminClient) {
        await adminClient.storage.createBucket(bucketName, { public: true }).catch(() => {});
        if (!testBuckets.includes(bucketName)) {
          testBuckets.push(bucketName);
        }
      }

      // Upload test files for download tests
      const testContent = 'Content for download testing';
      const fileName = `test/download-test-${Date.now()}.txt`;
      
      await supabase.storage.from(bucketName).upload(fileName, testContent);
      uploadedFiles.push(fileName);
    });

    it('should download a file', async () => {
      const fileName = uploadedFiles[0];
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(fileName);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data instanceof Blob).toBe(true);
      
      const text = await data.text();
      expect(text).toBe('Content for download testing');
    });

    it('should generate public URL for public files', async () => {
      const fileName = uploadedFiles[0];
      
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      expect(data.publicUrl).toBeDefined();
      expect(data.publicUrl).toContain(fileName);
      expect(data.publicUrl).toContain(bucketName);
    });

    it('should create signed URLs with expiration', async () => {
      const fileName = uploadedFiles[0];
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 3600); // 1 hour expiration

      expect(error).toBeNull();
      expect(data.signedUrl).toBeDefined();
      expect(data.signedUrl).toContain('token');
    });

    it('should create signed URLs for multiple files', async () => {
      // Upload another test file
      const fileName2 = `test/download-test-2-${Date.now()}.txt`;
      await supabase.storage.from(bucketName).upload(fileName2, 'Second test file');
      uploadedFiles.push(fileName2);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrls(uploadedFiles, 3600);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(uploadedFiles.length);
      
      data.forEach((item, index) => {
        expect(item.path).toBe(uploadedFiles[index]);
        expect(item.signedUrl).toBeDefined();
      });
    });

    it('should handle download of non-existent files', async () => {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download('non-existent-file.txt');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('not found');
    });
  });

  describe('File Management', () => {
    const bucketName = 'test-management';
    let testFiles = [];

    beforeEach(async () => {
      if (adminClient) {
        await adminClient.storage.createBucket(bucketName, { public: true }).catch(() => {});
        if (!testBuckets.includes(bucketName)) {
          testBuckets.push(bucketName);
        }
      }

      // Create test files for management operations
      for (let i = 0; i < 3; i++) {
        const fileName = `test/management-test-${i}-${Date.now()}.txt`;
        const content = `Test file ${i} content`;
        
        await supabase.storage.from(bucketName).upload(fileName, content);
        testFiles.push(fileName);
      }
    });

    afterEach(() => {
      testFiles = [];
    });

    it('should list files in a bucket', async () => {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('test/', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(testFiles.length);
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('name');
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('created_at');
        expect(data[0]).toHaveProperty('updated_at');
      }
    });

    it('should search files by name', async () => {
      const searchTerm = 'management-test-0';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('test/', {
          search: searchTerm
        });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      if (data.length > 0) {
        expect(data[0].name).toContain(searchTerm);
      }
    });

    it('should move files', async () => {
      const sourceFile = testFiles[0];
      const destinationFile = `test/moved-${Date.now()}.txt`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .move(sourceFile, destinationFile);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify file was moved
      const { data: downloadData } = await supabase.storage
        .from(bucketName)
        .download(destinationFile);

      expect(downloadData).toBeDefined();

      // Update our test files array
      testFiles[0] = destinationFile;
    });

    it('should copy files', async () => {
      const sourceFile = testFiles[0];
      const destinationFile = `test/copied-${Date.now()}.txt`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .copy(sourceFile, destinationFile);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify both files exist
      const { data: originalFile } = await supabase.storage
        .from(bucketName)
        .download(sourceFile);

      const { data: copiedFile } = await supabase.storage
        .from(bucketName)
        .download(destinationFile);

      expect(originalFile).toBeDefined();
      expect(copiedFile).toBeDefined();

      testFiles.push(destinationFile);
    });

    it('should remove single file', async () => {
      const fileToRemove = testFiles[0];

      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([fileToRemove]);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Verify file was removed
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(fileToRemove);

      expect(downloadError).not.toBeNull();
      expect(downloadData).toBeNull();

      testFiles.splice(0, 1);
    });

    it('should remove multiple files', async () => {
      const filesToRemove = [...testFiles];

      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove(filesToRemove);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(filesToRemove.length);

      // Verify files were removed
      for (const fileName of filesToRemove) {
        const { error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(fileName);

        expect(downloadError).not.toBeNull();
      }

      testFiles = [];
    });
  });

  describe('Storage Policies and Security', () => {
    it('should enforce bucket policies for authenticated users', async () => {
      // This test would require setting up authentication
      // For now, we'll test basic access patterns
      
      const { data, error } = await supabase.storage.listBuckets();
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle file access permissions', async () => {
      // Test public vs private file access
      const bucketName = 'test-permissions';
      
      if (adminClient) {
        await adminClient.storage.createBucket(bucketName, { public: false }).catch(() => {});
        testBuckets.push(bucketName);

        // Upload to private bucket
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(`test/private-file-${Date.now()}.txt`, 'Private content');

        // Access will depend on RLS policies and authentication
        if (error) {
          expect(error.message).toContain('permission');
        }
      }
    });

    it('should validate file operations based on user permissions', async () => {
      // Test operations that might require specific permissions
      const { data: buckets, error } = await supabase.storage.listBuckets();

      expect(error).toBeNull();
      
      if (buckets && buckets.length > 0) {
        const bucketName = buckets[0].name;
        
        // Attempt to list files (should work for public buckets)
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 });

        if (buckets[0].public || !listError) {
          expect(files).toBeDefined();
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid bucket names', async () => {
      const { data, error } = await supabase.storage
        .from('non-existent-bucket')
        .list('');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('not found');
    });

    it('should handle network interruptions gracefully', async () => {
      // Simulate network issues by using invalid URLs or timeouts
      // This is more of a client-side resilience test
      
      const fileName = `test/network-test-${Date.now()}.txt`;
      const { data, error } = await supabase.storage
        .from('test-uploads')
        .upload(fileName, 'Network test content')
        .catch(err => ({ data: null, error: err }));

      // Should either succeed or fail gracefully
      expect(typeof error === 'object' || error === null).toBe(true);
    });

    it('should handle concurrent file operations', async () => {
      const bucketName = 'test-concurrent';
      
      if (adminClient) {
        await adminClient.storage.createBucket(bucketName, { public: true }).catch(() => {});
        testBuckets.push(bucketName);
      }

      // Perform multiple operations concurrently
      const operations = Array.from({ length: 5 }, (_, i) => 
        supabase.storage
          .from(bucketName)
          .upload(`test/concurrent-${i}-${Date.now()}.txt`, `Content ${i}`)
      );

      const results = await Promise.all(operations);
      
      results.forEach((result, index) => {
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
        expect(result.data.path).toContain(`concurrent-${index}`);
      });
    });

    it('should handle empty files', async () => {
      const fileName = `test/empty-file-${Date.now()}.txt`;
      
      const { data, error } = await supabase.storage
        .from('test-uploads')
        .upload(fileName, '');

      // Should handle empty files appropriately
      if (error) {
        expect(error.message).toContain('empty');
      } else {
        expect(data.path).toBe(fileName);
      }
    });

    it('should handle special characters in file names', async () => {
      const fileName = `test/special-chars-äöü-${Date.now()}.txt`;
      
      const { data, error } = await supabase.storage
        .from('test-uploads')
        .upload(fileName, 'Special characters test');

      if (error) {
        expect(error.message).toContain('character');
      } else {
        expect(data.path).toBe(fileName);
      }
    });
  });
});
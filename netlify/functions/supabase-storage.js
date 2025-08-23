/**
 * Netlify Function: Supabase Storage Handler
 * Handles file uploads, downloads, and management with Supabase Storage
 */

const { 
  getSupabaseServiceClient,
  withErrorHandling, 
  formatResponse, 
  getStandardHeaders, 
  handleCORS,
  validateRequiredFields,
  sanitizeInput,
  checkRateLimit
} = require('./utils/supabase');

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders();
  const { httpMethod, path } = event;

  // Parse path to extract bucket and file info
  const pathSegments = path.split('/').filter(Boolean);
  const action = pathSegments[pathSegments.length - 1] || 'upload';

  try {
    switch (httpMethod) {
      case 'POST':
        if (action === 'upload') {
          return await handleFileUpload(event, headers);
        } else if (action === 'signed-url') {
          return await handleSignedUrlGeneration(event, headers);
        }
        break;
      case 'GET':
        if (action === 'list') {
          return await handleFileList(event, headers);
        } else if (action === 'download') {
          return await handleFileDownload(event, headers);
        }
        break;
      case 'DELETE':
        return await handleFileDelete(event, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify(formatResponse(
            false, 
            null, 
            `Method ${httpMethod} not allowed`, 
            null, 
            405
          ))
        };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Unknown action: ${action}`, 
        null, 
        400
      ))
    };

  } catch (error) {
    console.error('Storage API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Storage operation failed', 
        error.message, 
        500
      ))
    };
  }
};

/**
 * Handle file upload
 */
async function handleFileUpload(event, headers) {
  const supabase = getSupabaseServiceClient();
  
  // Rate limiting
  const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(clientIP, 10, 300000)) { // 10 uploads per 5 minutes
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Too many upload requests. Please try again later.', 
        null, 
        429
      ))
    };
  }

  let uploadData;
  try {
    uploadData = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  // Validate required fields
  const validation = validateRequiredFields(uploadData, ['bucket', 'fileName', 'fileData']);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Missing required fields: ${validation.missing.join(', ')}`, 
        null, 
        400
      ))
    };
  }

  const { bucket, fileName, fileData, contentType, metadata } = uploadData;

  // Sanitize inputs
  const safeBucket = sanitizeInput(bucket);
  const safeFileName = sanitizeInput(fileName);

  // Validate file type and size
  const validationResult = validateFile(safeFileName, fileData, contentType);
  if (!validationResult.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        validationResult.message, 
        null, 
        400
      ))
    };
  }

  // Generate unique file path to prevent collisions
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = crypto.randomBytes(8).toString('hex');
  const fileExtension = safeFileName.split('.').pop();
  const uniqueFileName = `${timestamp}_${randomId}.${fileExtension}`;
  const filePath = metadata?.folder ? `${metadata.folder}/${uniqueFileName}` : uniqueFileName;

  // Convert base64 to buffer if needed
  let fileBuffer;
  if (typeof fileData === 'string' && fileData.startsWith('data:')) {
    // Handle base64 data URLs
    const base64Data = fileData.split(',')[1];
    fileBuffer = Buffer.from(base64Data, 'base64');
  } else if (typeof fileData === 'string') {
    // Handle plain base64
    fileBuffer = Buffer.from(fileData, 'base64');
  } else {
    fileBuffer = fileData;
  }

  // Upload to Supabase Storage
  const uploadResult = await withErrorHandling(async () => {
    return await supabase.storage
      .from(safeBucket)
      .upload(filePath, fileBuffer, {
        contentType: contentType || 'application/octet-stream',
        metadata: {
          originalName: safeFileName,
          uploadedBy: metadata?.uploadedBy || 'anonymous',
          uploadedAt: new Date().toISOString(),
          ...metadata
        },
        upsert: false
      });
  }, 'file upload');

  if (!uploadResult.success) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'File upload failed', 
        uploadResult.error, 
        500
      ))
    };
  }

  // Get public URL if bucket is public
  const { data: publicUrlData } = supabase.storage
    .from(safeBucket)
    .getPublicUrl(filePath);

  const responseData = {
    file: {
      path: filePath,
      originalName: safeFileName,
      size: fileBuffer.length,
      contentType: contentType,
      publicUrl: publicUrlData?.publicUrl || null,
      metadata: uploadResult.data.metadata
    },
    upload: uploadResult.data
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      responseData,
      'File uploaded successfully'
    ))
  };
}

/**
 * Handle signed URL generation for secure uploads
 */
async function handleSignedUrlGeneration(event, headers) {
  const supabase = getSupabaseServiceClient();
  
  let urlData;
  try {
    urlData = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  const validation = validateRequiredFields(urlData, ['bucket', 'fileName']);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Missing required fields: ${validation.missing.join(', ')}`, 
        null, 
        400
      ))
    };
  }

  const { bucket, fileName, expiresIn } = urlData;
  const safeBucket = sanitizeInput(bucket);
  const safeFileName = sanitizeInput(fileName);
  const expiration = expiresIn || 3600; // 1 hour default

  // Generate signed URL
  const signedResult = await withErrorHandling(async () => {
    return await supabase.storage
      .from(safeBucket)
      .createSignedUrl(safeFileName, expiration);
  }, 'signed URL generation');

  if (!signedResult.success) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Failed to generate signed URL', 
        signedResult.error, 
        500
      ))
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        signedUrl: signedResult.data.signedUrl,
        expiresAt: new Date(Date.now() + expiration * 1000).toISOString()
      },
      'Signed URL generated successfully'
    ))
  };
}

/**
 * Handle file listing
 */
async function handleFileList(event, headers) {
  const supabase = getSupabaseServiceClient();
  
  const params = new URLSearchParams(event.queryString || '');
  const bucket = params.get('bucket');
  const folder = params.get('folder') || '';
  const limit = parseInt(params.get('limit')) || 100;
  const offset = parseInt(params.get('offset')) || 0;

  if (!bucket) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Bucket parameter is required', 
        null, 
        400
      ))
    };
  }

  const listResult = await withErrorHandling(async () => {
    return await supabase.storage
      .from(sanitizeInput(bucket))
      .list(folder, {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'desc' }
      });
  }, 'file listing');

  if (!listResult.success) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Failed to list files', 
        listResult.error, 
        500
      ))
    };
  }

  const files = listResult.data.map(file => ({
    ...file,
    publicUrl: file.name ? supabase.storage.from(bucket).getPublicUrl(`${folder}${folder ? '/' : ''}${file.name}`).data.publicUrl : null
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        files,
        pagination: {
          offset,
          limit,
          count: files.length
        }
      },
      'Files listed successfully'
    ))
  };
}

/**
 * Handle file download
 */
async function handleFileDownload(event, headers) {
  const supabase = getSupabaseServiceClient();
  
  const params = new URLSearchParams(event.queryString || '');
  const bucket = params.get('bucket');
  const filePath = params.get('path');

  if (!bucket || !filePath) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Bucket and path parameters are required', 
        null, 
        400
      ))
    };
  }

  const downloadResult = await withErrorHandling(async () => {
    return await supabase.storage
      .from(sanitizeInput(bucket))
      .download(sanitizeInput(filePath));
  }, 'file download');

  if (!downloadResult.success) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'File not found or download failed', 
        downloadResult.error, 
        404
      ))
    };
  }

  // Convert blob to base64 for JSON response
  const arrayBuffer = await downloadResult.data.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        fileName: filePath.split('/').pop(),
        contentType: downloadResult.data.type,
        size: downloadResult.data.size,
        data: base64Data
      },
      'File downloaded successfully'
    ))
  };
}

/**
 * Handle file deletion
 */
async function handleFileDelete(event, headers) {
  const supabase = getSupabaseServiceClient();
  
  const params = new URLSearchParams(event.queryString || '');
  const bucket = params.get('bucket');
  const filePath = params.get('path');

  if (!bucket || !filePath) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Bucket and path parameters are required', 
        null, 
        400
      ))
    };
  }

  const deleteResult = await withErrorHandling(async () => {
    return await supabase.storage
      .from(sanitizeInput(bucket))
      .remove([sanitizeInput(filePath)]);
  }, 'file deletion');

  if (!deleteResult.success) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'File deletion failed', 
        deleteResult.error, 
        500
      ))
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      { deletedFile: filePath },
      'File deleted successfully'
    ))
  };
}

/**
 * Validate uploaded file
 */
function validateFile(fileName, fileData, contentType) {
  // Check file extension
  const allowedExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', // Images
    'pdf', 'doc', 'docx', 'txt', // Documents
    'mp4', 'mov', 'avi', // Videos
    'mp3', 'wav', 'ogg', // Audio
    'zip', 'tar', 'gz' // Archives
  ];

  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      message: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
    };
  }

  // Check file size (approximate)
  let fileSize = 0;
  if (typeof fileData === 'string') {
    if (fileData.startsWith('data:')) {
      fileSize = Math.ceil(fileData.length * 0.75); // Approximate base64 to binary size
    } else {
      fileSize = Math.ceil(fileData.length * 0.75);
    }
  } else if (fileData instanceof Buffer) {
    fileSize = fileData.length;
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    return {
      valid: false,
      message: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
    };
  }

  // Validate content type
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav',
    'application/zip'
  ];

  if (contentType && !allowedMimeTypes.includes(contentType)) {
    return {
      valid: false,
      message: `MIME type not allowed: ${contentType}`
    };
  }

  return { valid: true };
}
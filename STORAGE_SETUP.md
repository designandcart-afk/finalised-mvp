# Supabase Storage Setup for Chat Files

This guide explains how to set up Supabase Storage for handling file attachments in chat.

## Features
- **Image uploads**: Max 1MB, automatically compressed
- **File uploads**: Max 25MB (PDFs, documents, etc.)
- **Automatic thumbnails**: Generated for images
- **Public access**: Files are publicly accessible via URL
- **File tracking**: All uploads logged in `files` table

## Setup Steps

### 1. Run Database Migration

First, apply the files table migration:

```bash
# If you're using Supabase CLI
supabase db reset

# Or run the SQL file manually in Supabase Dashboard > SQL Editor
```

Run the migration file: `supabase/migrations/0005_add_chat_files_support.sql`

### 2. Create Storage Bucket

In the Supabase Dashboard:

1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Bucket name: `chat-files`
4. Set as **Public bucket** (check the box)
5. Click **"Create bucket"**

Or run the SQL script:

```bash
# In Supabase Dashboard > SQL Editor
# Run: scripts/setup-storage-bucket.sql
```

### 3. Configure Storage Policies

The policies are automatically created by the SQL script. They allow:
- **Public read access**: Anyone can view files
- **Authenticated upload**: Only logged-in users can upload
- **Owner delete**: Users can delete their own files

### 4. Verify Setup

Test the upload functionality:

1. Go to the chat page in your app
2. Try uploading an image (should be < 1MB)
3. Try uploading a file (should be < 25MB)
4. Check Supabase Dashboard:
   - **Storage > chat-files**: Files should appear
   - **Table Editor > files**: File records should be logged

## File Size Limits

- **Images**: 1MB max (automatically compressed)
- **Files**: 25MB max (PDFs, documents, etc.)

These limits are enforced in:
- `lib/uploadAdapter.ts` (client-side validation)
- Storage bucket config (server-side enforcement)

## Allowed File Types

### Images
- JPEG, PNG, GIF, WebP

### Documents
- PDF
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- Text files
- ZIP archives

## Database Schema

### `files` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Auto-generated primary key |
| created_at | timestamp | Upload timestamp |
| project_id | uuid | Project reference |
| message_id | uuid | Chat message reference |
| name | text | Original filename |
| size | bigint | File size in bytes |
| mime_type | text | File MIME type |
| url | text | Public Supabase Storage URL |
| thumbnail_url | text | Thumbnail URL (for images) |
| uploader_id | uuid | User who uploaded |
| type | text | 'image' or 'file' |
| storage_path | text | Path in storage bucket |

## File URL Format

Files uploaded to Supabase Storage will have URLs like:

```
https://<project-id>.supabase.co/storage/v1/object/public/chat-files/<project-id>/images/1234567890_abc123.jpg
```

## Troubleshooting

### Files not uploading
1. Check browser console for errors
2. Verify file size is within limits
3. Check file type is allowed
4. Ensure user is authenticated

### Storage bucket not found
1. Verify bucket created in Supabase Dashboard
2. Check bucket name is exactly `chat-files`
3. Ensure bucket is set to public

### RLS policies blocking uploads
1. Verify user is authenticated
2. Check policies in Supabase Dashboard > Storage > Policies
3. Run the storage bucket SQL script again

### Images not compressing
1. Check file is valid image format
2. Verify browser supports Canvas API
3. Check console for compression errors

## Code Files Modified

- `lib/uploadAdapter.ts`: Main upload logic with Supabase Storage integration
- `lib/storage.ts`: File metadata tracking in database
- `supabase/migrations/0005_add_chat_files_support.sql`: Database schema
- `scripts/setup-storage-bucket.sql`: Storage bucket creation

## Migration from localStorage

Previous implementation stored files in localStorage as base64. This has been replaced with Supabase Storage for:
- Better performance
- No size limits from localStorage
- Persistent storage across devices
- Proper file management

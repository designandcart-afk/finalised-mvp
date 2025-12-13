#!/bin/bash

# Supabase Storage Setup Script
# This script helps you set up the storage bucket for chat files

echo "🚀 Supabase Storage Setup for Chat Files"
echo "=========================================="
echo ""

# Check if SUPABASE_URL and SUPABASE_ANON_KEY are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Environment variables not found."
    echo "Please make sure you have set:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
    echo "You can find these in your Supabase Dashboard > Project Settings > API"
    echo ""
fi

echo "📋 Setup Steps:"
echo ""
echo "1️⃣  Run Database Migration"
echo "   Go to Supabase Dashboard > SQL Editor"
echo "   Copy and run: supabase/migrations/0005_add_chat_files_support.sql"
echo ""
echo "2️⃣  Create Storage Bucket"
echo "   Option A: Use Dashboard"
echo "     - Go to Storage > New bucket"
echo "     - Name: chat-files"
echo "     - Public: YES ✓"
echo "     - Click Create"
echo ""
echo "   Option B: Run SQL"
echo "     - Go to SQL Editor"
echo "     - Copy and run: scripts/setup-storage-bucket.sql"
echo ""
echo "3️⃣  Verify Setup"
echo "   - Storage > chat-files bucket should exist"
echo "   - Table Editor > files table should exist"
echo "   - Try uploading a file in your app"
echo ""
echo "📖 For detailed instructions, see STORAGE_SETUP.md"
echo ""
echo "✅ File size limits:"
echo "   - Images: 1MB max"
echo "   - Files: 25MB max"
echo ""
echo "🎉 Ready to go!"

# Open the relevant files in the default editor
echo ""
read -p "Would you like to open the SQL files? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "supabase/migrations/0005_add_chat_files_support.sql" ]; then
        echo "Opening migration file..."
        code "supabase/migrations/0005_add_chat_files_support.sql" || open "supabase/migrations/0005_add_chat_files_support.sql"
    fi
    if [ -f "scripts/setup-storage-bucket.sql" ]; then
        echo "Opening storage bucket SQL..."
        code "scripts/setup-storage-bucket.sql" || open "scripts/setup-storage-bucket.sql"
    fi
fi

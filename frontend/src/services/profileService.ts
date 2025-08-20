// File: src/services/profileService.ts
// Supabase integration for user profiles

import { supabase, storageConfig } from '../config/supabaseConfig';
import { logger } from '../config/appConfig';

// Profile interface matching database schema
export interface UserProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
  status_aktif: boolean;
  created_at: string;
  updated_at: string;
}

// Profile update interface (excludes read-only fields)
export interface ProfileUpdateData {
  username?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  photo_url?: string | null;
}

// Helper: get current user from Supabase auth
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    logger.error('Error getting current user:', error);
    throw new Error('User not authenticated');
  }
  return user;
};

/**
 * Mengambil data profil pengguna yang sedang login dari Supabase.
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile as UserProfile;
  } catch (error) {
    logger.error('getUserProfile error:', error);
    throw error;
  }
};

/**
 * Memperbarui data profil pengguna di Supabase.
 */
export const updateUserProfile = async (profileData: ProfileUpdateData): Promise<UserProfile> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Validate email uniqueness if email is being updated
    if (profileData.email) {
      const { count: emailCount, error: emailCheckError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email', profileData.email)
        .neq('id', user.id);

      if (emailCheckError) {
        logger.error('Error checking email uniqueness:', emailCheckError);
        throw new Error('Failed to validate email');
      }

      if ((emailCount ?? 0) > 0) {
        throw new Error('Email already exists');
      }
    }

    // Validate username uniqueness if username is being updated
    if (profileData.username) {
      const { count: usernameCount, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', profileData.username)
        .neq('id', user.id);

      if (usernameCheckError) {
        logger.error('Error checking username uniqueness:', usernameCheckError);
        throw new Error('Failed to validate username');
      }

      if ((usernameCount ?? 0) > 0) {
        throw new Error('Username already exists');
      }
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }

    return updatedProfile as UserProfile;
  } catch (error) {
    logger.error('updateUserProfile error:', error);
    throw error;
  }
};

/**
 * Upload foto profil ke Supabase Storage.
 */
export const uploadProfilePhoto = async (file: File): Promise<string> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get current profile to check for existing photo
    const currentProfile = await getUserProfile();
    
    // Delete existing photo files if any exist
    if (currentProfile.photo_url) {
      try {
        // List all files in user's folder to delete any existing photos
        const { data: files, error: listError } = await supabase.storage
          .from(storageConfig.profileBucket)
          .list(`${user.id}/`, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (!listError && files && files.length > 0) {
          // Delete all existing files in user's folder
          const filesToDelete = files.map(file => `${user.id}/${file.name}`);
          const { error: deleteError } = await supabase.storage
            .from(storageConfig.profileBucket)
            .remove(filesToDelete);
          
          if (deleteError) {
            logger.warn('Warning: Could not delete old profile photos:', deleteError);
          } else {
            logger.info('Successfully deleted old profile photos');
          }
        }
      } catch (deleteErr) {
        logger.warn('Warning: Error during old photo cleanup:', deleteErr);
        // Continue with upload even if deletion fails
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/profile.${fileExt}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(storageConfig.profileBucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // Use upsert as fallback in case deletion didn't work
      });

    if (error) {
      logger.error('Error uploading profile photo:', error);
      throw new Error(`Failed to upload profile photo: ${error.message}`);
    }

    // Verify that the file was actually uploaded by checking if it exists
    const { data: checkData, error: checkError } = await supabase.storage
      .from(storageConfig.profileBucket)
      .list(`${user.id}/`, {
        limit: 10,
        search: `profile.${fileExt}`
      });

    if (checkError || !checkData || checkData.length === 0) {
      logger.error('File upload verification failed:', checkError);
      throw new Error('Upload failed: File not found in storage after upload');
    }

    // Get public URL (store clean URL in DB; add cache-busting only in UI layer)
    const { data: { publicUrl } } = supabase.storage
      .from(storageConfig.profileBucket)
      .getPublicUrl(fileName);

    logger.info('Photo uploaded successfully:', fileName);
    return publicUrl;
  } catch (error) {
    logger.error('uploadProfilePhoto error:', error);
    throw error;
  }
};

/**
 * Hapus foto profil dari Supabase Storage.
 */
export const deleteProfilePhoto = async (): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // List all files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(storageConfig.profileBucket)
      .list(user.id);

    if (listError) {
      logger.error('Error listing profile photos:', listError);
      throw new Error('Failed to list profile photos');
    }

    if (files && files.length > 0) {
      // Delete all files in user's folder
      const filePaths = files.map(file => `${user.id}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(storageConfig.profileBucket)
        .remove(filePaths);

      if (deleteError) {
        logger.error('Error deleting profile photos:', deleteError);
        throw new Error('Failed to delete profile photos');
      }
    }
  } catch (error) {
    logger.error('deleteProfilePhoto error:', error);
    throw error;
  }
};

/**
 * Deaktivasi akun pengguna (soft delete).
 */
export const deactivateAccount = async (): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ status_aktif: false })
      .eq('id', user.id);

    if (error) {
      logger.error('Error deactivating account:', error);
      throw new Error('Failed to deactivate account');
    }
  } catch (error) {
    logger.error('deactivateAccount error:', error);
    throw error;
  }
};

/**
 * Aktivasi kembali akun pengguna.
 */
export const reactivateAccount = async (): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ status_aktif: true })
      .eq('id', user.id);

    if (error) {
      logger.error('Error reactivating account:', error);
      throw new Error('Failed to reactivate account');
    }
  } catch (error) {
    logger.error('reactivateAccount error:', error);
    throw error;
  }
};

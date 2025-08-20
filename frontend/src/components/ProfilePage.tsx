import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  deactivateAccount,
  UserProfile,
  ProfileUpdateData,
} from "../services/profileService";
import { logout } from "../services/authService";
import { logger } from "../config/appConfig";
import "./ProfilePage.css";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await getUserProfile();
      setProfile(profileData);
      setFormData({
        username: profileData.username || "",
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        email: profileData.email || "",
      });
      // Add cache-busting parameter to photo URL to prevent caching issues
      const photoUrl = profileData.photo_url
        ? `${profileData.photo_url}${
            profileData.photo_url.includes("?") ? "&" : "?"
          }t=${Date.now()}`
        : null;
      setPhotoPreview(photoUrl);
    } catch (err: any) {
      logger.error("Error loading profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      setPhotoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      setError(null);

      await deleteProfilePhoto();

      // Update profile with null photo_url
      const updatedProfile = await updateUserProfile({ photo_url: null });
      setProfile(updatedProfile);
      setPhotoPreview(null);
      setPhotoFile(null);

      setSuccess("Photo removed successfully");
    } catch (err: any) {
      logger.error("Error removing photo:", err);
      setError(err.message || "Failed to remove photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      let photoUrl = profile?.photo_url;

      // Upload photo if new file selected
      if (photoFile) {
        setUploading(true);
        photoUrl = await uploadProfilePhoto(photoFile);
      }

      // Prepare update data
      const updateData: ProfileUpdateData = {
        username: formData.username.trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim(),
      };

      if (photoUrl !== profile?.photo_url) {
        updateData.photo_url = photoUrl;
      }

      // Update profile
      const updatedProfile = await updateUserProfile(updateData);
      setProfile(updatedProfile);
      setPhotoFile(null);

      // Update photo preview with the new URL (with cache-busting)
      if (photoUrl && photoUrl !== profile?.photo_url) {
        setPhotoPreview(photoUrl);
      }

      setSuccess("Profile updated successfully");
    } catch (err: any) {
      logger.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setUpdating(false);
      setUploading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to deactivate your account? This action can be reversed later."
      )
    ) {
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      await deactivateAccount();
      await logout();

      navigate("/login", {
        state: { message: "Account deactivated successfully" },
      });
    } catch (err: any) {
      logger.error("Error deactivating account:", err);
      setError(err.message || "Failed to deactivate account");
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="error-message">
            <h2>Profile Not Found</h2>
            <p>Unable to load your profile. Please try again.</p>
            <button onClick={loadProfile} className="btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Manage your account information and preferences</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Photo Section */}
          <div className="form-section">
            <h3>Profile Photo</h3>
            <div className="photo-section">
              <div className="photo-preview">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="profile-photo"
                  />
                ) : (
                  <div className="photo-placeholder">
                    <span className="photo-icon">👤</span>
                  </div>
                )}
              </div>
              <div className="photo-controls">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="file-input"
                />
                <label htmlFor="photo-upload" className="btn btn-secondary">
                  {uploading ? "Uploading..." : "Choose Photo"}
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="btn btn-danger"
                    disabled={uploading}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <p className="photo-hint">
                Supported formats: JPG, PNG, GIF. Max size: 5MB
              </p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="form-section">
            <h3>Account Status</h3>
            <div className="status-info">
              <div className="status-item">
                <span className="status-label">Status:</span>
                <span
                  className={`status-badge ${
                    profile.status_aktif ? "active" : "inactive"
                  }`}
                >
                  {profile.status_aktif ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Member since:</span>
                <span className="status-value">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="submit"
              disabled={updating || uploading}
              className="btn btn-primary"
            >
              {updating ? "Updating..." : "Update Profile"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <p>
            Once you deactivate your account, you will be logged out and your
            account will be disabled.
          </p>
          <button
            type="button"
            onClick={handleDeactivateAccount}
            disabled={updating}
            className="btn btn-danger"
          >
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

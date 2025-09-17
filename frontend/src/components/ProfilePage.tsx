import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Avatar,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  styled,
  IconButton,
  Badge,
  Chip,
} from "@mui/material";
import {
  Person,
  PhotoCamera,
  Delete,
  Save,
  Cancel,
  Warning,
  CheckCircle,
  Email,
  AccountCircle,
  Schedule,
  Security,
} from "@mui/icons-material";
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

const StyledCard = styled(Card)(({ theme }) => ({
  background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
  color: "white",
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 16,
  color: "white",
  marginBottom: theme.spacing(3),
  transition: "all 0.3s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.08)",
    transform: "translateY(-2px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#2196F3",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.7)",
    "&.Mui-focused": {
      color: "#2196F3",
    },
  },
  "& .MuiOutlinedInput-input": {
    color: "white",
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 50,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: 600,
  textTransform: "none",
  marginRight: theme.spacing(2),
  marginBottom: theme.spacing(1),
  transition: "all 0.3s ease",
  [theme.breakpoints.down('sm')]: {
    padding: "10px 20px",
    fontSize: "0.9rem",
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(0.8),
  },
  [theme.breakpoints.down('xs')]: {
    padding: "8px 16px",
    fontSize: "0.8rem",
    marginRight: theme.spacing(0.8),
    marginBottom: theme.spacing(0.6),
  },
  "&.MuiButton-contained": {
    background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
    "&:hover": {
      background: "linear-gradient(45deg, #1976D2 30%, #0288D1 90%)",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(33, 150, 243, 0.4)",
    },
  },
  "&.MuiButton-outlined": {
    borderColor: "rgba(255, 255, 255, 0.3)",
    color: "white",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.6)",
      background: "rgba(255, 255, 255, 0.1)",
    },
  },
}));

const DangerButton = styled(Button)(({ theme }) => ({
  borderRadius: 50,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: 600,
  textTransform: "none",
  background: "linear-gradient(45deg, #f44336 30%, #E53935 90%)",
  color: "white",
  transition: "all 0.3s ease",
  [theme.breakpoints.down('sm')]: {
    padding: "10px 20px",
    fontSize: "0.9rem",
  },
  [theme.breakpoints.down('xs')]: {
    padding: "8px 16px",
    fontSize: "0.8rem",
  },
  "&:hover": {
    background: "linear-gradient(45deg, #d32f2f 30%, #c62828 90%)",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 25px rgba(244, 67, 54, 0.4)",
  },
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  fontSize: "3rem",
  background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
  boxShadow: "0 8px 32px rgba(33, 150, 243, 0.3)",
  border: "4px solid rgba(255, 255, 255, 0.2)",
  [theme.breakpoints.down('sm')]: {
    width: 100,
    height: 100,
    fontSize: "2.5rem",
  },
  [theme.breakpoints.down('xs')]: {
    width: 80,
    height: 80,
    fontSize: "2rem",
  },
}));

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
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <GlassCard sx={{ textAlign: "center", p: 4 }}>
          <CircularProgress 
            size={60} 
            sx={{ 
              mb: 3, 
              color: "#2196F3",
              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }} 
          />
          <Typography variant="h6" sx={{ color: "#e3f2fd" }}>
            Loading profile...
          </Typography>
        </GlassCard>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <GlassCard sx={{ textAlign: "center", p: 4 }}>
          <Warning sx={{ fontSize: 60, color: "#f44336", mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, color: "#e3f2fd" }}>
            Profile Not Found
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.8 }}>
            Unable to load your profile. Please try again.
          </Typography>
          <ActionButton
            variant="contained"
            onClick={loadProfile}
            startIcon={<CheckCircle />}
          >
            Retry
          </ActionButton>
        </GlassCard>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h3"
            sx={{ 
              fontWeight: 700, 
              color: "white",
              mb: 1,
            }}
          >
            Profile
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.7, color: "white" }}>
            View all your profile details here
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ 
              mb: 3,
              backgroundColor: "rgba(244, 67, 54, 0.1)",
              color: "white",
              border: "1px solid rgba(244, 67, 54, 0.3)",
              borderRadius: 2,
              "& .MuiAlert-icon": {
                color: "#f44336",
              },
            }}
          >
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert 
            severity="success" 
            onClose={() => setSuccess(null)}
            sx={{ 
              mb: 3,
              backgroundColor: "rgba(76, 175, 80, 0.1)",
              color: "white",
              border: "1px solid rgba(76, 175, 80, 0.3)",
              borderRadius: 2,
              "& .MuiAlert-icon": {
                color: "#4CAF50",
              },
            }}
          >
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} sx={{ alignItems: "stretch", justifyContent: "center" }}>
            {/* Profile Card */}
            <Grid item xs={12} md={6} lg={5}>
              <GlassCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ p: 4, textAlign: "center", flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Profile Name & Status */}
                  <Typography variant="h4" sx={{ 
                    color: "white", 
                    fontWeight: 700,
                    mb: 1 
                  }}>
                    {formData.first_name && formData.last_name 
                      ? `${formData.first_name} ${formData.last_name}` 
                      : formData.username}
                  </Typography>

                  {/* Avatar Section */}
                  <Box sx={{ mt: "auto", position: "relative", display: "inline-block", alignSelf: "center" }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={
                        <IconButton
                          component="label"
                          sx={{
                            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                            color: "white",
                            width: 48,
                            height: 48,
                            "&:hover": {
                              background: "linear-gradient(45deg, #1976D2 30%, #0288D1 90%)",
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.3s ease",
                          }}
                        >
                          <PhotoCamera sx={{ fontSize: 24 }} />
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handlePhotoChange}
                          />
                        </IconButton>
                      }
                    >
                      <Avatar
                        src={photoPreview || undefined}
                        sx={{
                          width: 200,
                          height: 200,
                          fontSize: "4rem",
                          background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                          boxShadow: "0 12px 40px rgba(33, 150, 243, 0.4)",
                          border: "6px solid rgba(255, 255, 255, 0.1)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "scale(1.05)",
                            boxShadow: "0 16px 50px rgba(33, 150, 243, 0.6)",
                          },
                        }}
                      >
                        {!photoPreview && <Person sx={{ fontSize: "4rem" }} />}
                      </Avatar>
                    </Badge>

                    {uploading && (
                      <Box sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "rgba(0, 0, 0, 0.7)",
                        borderRadius: "50%",
                        width: 200,
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                      }}>
                        <CircularProgress size={40} sx={{ color: "#2196F3", mb: 1 }} />
                        <Typography variant="body2" sx={{ color: "white" }}>
                          Uploading...
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Upload Guidelines */}
                  <Box sx={{ mt: "auto" }}>
                    <Typography variant="body2" sx={{ 
                      opacity: 0.7, 
                      lineHeight: 1.6,
                      color: "rgba(255, 255, 255, 0.7)",
                      mb: 3
                    }}>
                      Supported formats: JPG, PNG, GIF<br />
                      Max size: 5MB
                    </Typography>

                    {/* Remove Photo Button */}
                    {photoPreview && (
                      <ActionButton
                        variant="outlined"
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        startIcon={<Delete />}
                        fullWidth
                      >
                        Remove Photo
                      </ActionButton>
                    )}
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>

            {/* Bio & Details */}
            <Grid item xs={12} md={7}>
              <GlassCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ p: 4, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
                    <AccountCircle sx={{ fontSize: 28, color: "#2196F3" }} />
                    <Typography variant="h5" sx={{ 
                      fontWeight: 600, 
                      color: "white",
                      background: "linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>
                      Bio & other details
                    </Typography>
                    <Box sx={{ ml: "auto" }}>
                      <Box sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: profile.status_aktif 
                          ? "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)"
                          : "linear-gradient(45deg, #f44336 30%, #E53935 90%)",
                        boxShadow: profile.status_aktif 
                          ? "0 0 10px rgba(76, 175, 80, 0.6)"
                          : "0 0 10px rgba(244, 67, 54, 0.6)",
                      }} />
                    </Box>
                  </Box>

                  <Grid container spacing={3} sx={{ flex: 1 }}>
                    {/* Left Column */}
                    <Grid item xs={12} sm={6} sx={{ display: "flex", flexDirection: "column" }}>
                      <Box sx={{ mb: 3, height: "100px" }}>
                        <Typography variant="body2" sx={{ 
                          color: "rgba(255, 255, 255, 0.7)", 
                          mb: 1,
                          fontSize: "0.875rem"
                        }}>
                          Username
                        </Typography>
                        <StyledTextField
                          fullWidth
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          required
                          variant="outlined"
                          size="small"
                          InputProps={{
                            startAdornment: <AccountCircle sx={{ color: "rgba(255, 255, 255, 0.5)", mr: 1 }} />,
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 3, height: "100px" }}>
                        <Typography variant="body2" sx={{ 
                          color: "rgba(255, 255, 255, 0.7)", 
                          mb: 1,
                          fontSize: "0.875rem"
                        }}>
                          First Name
                        </Typography>
                        <StyledTextField
                          fullWidth
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            startAdornment: <Person sx={{ color: "rgba(255, 255, 255, 0.5)", mr: 1 }} />,
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 3, height: "80px" }}>
                        <Typography variant="body2" sx={{ 
                          color: "rgba(255, 255, 255, 0.7)", 
                          mb: 1,
                          fontSize: "0.875rem"
                        }}>
                          Account Status
                        </Typography>
                        <Box sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 2,
                          p: 2,
                          borderRadius: 2,
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          height: "48px",
                        }}>
                          <Security sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 20 }} />
                          <Typography variant="body2" sx={{ color: "#e3f2fd", fontWeight: 600 }}>
                            {profile.status_aktif ? "Active" : "Inactive"}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Right Column */}
                    <Grid item xs={12} sm={6} sx={{ display: "flex", flexDirection: "column" }}>
                      <Box sx={{ mb: 3, height: "100px" }}>
                        <Typography variant="body2" sx={{ 
                          color: "rgba(255, 255, 255, 0.7)", 
                          mb: 1,
                          fontSize: "0.875rem"
                        }}>
                          Email
                        </Typography>
                        <StyledTextField
                          fullWidth
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          variant="outlined"
                          size="small"
                          InputProps={{
                            startAdornment: <Email sx={{ color: "rgba(255, 255, 255, 0.5)", mr: 1 }} />,
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 3, height: "100px" }}>
                        <Typography variant="body2" sx={{ 
                          color: "rgba(255, 255, 255, 0.7)", 
                          mb: 1,
                          fontSize: "0.875rem"
                        }}>
                          Last Name
                        </Typography>
                        <StyledTextField
                          fullWidth
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            startAdornment: <Person sx={{ color: "rgba(255, 255, 255, 0.5)", mr: 1 }} />,
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 3, height: "80px" }}>
                        <Typography variant="body2" sx={{ 
                          color: "rgba(255, 255, 255, 0.7)", 
                          mb: 1,
                          fontSize: "0.875rem"
                        }}>
                          Member since
                        </Typography>
                        <Box sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 2,
                          p: 2,
                          borderRadius: 2,
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          height: "48px",
                        }}>
                          <Schedule sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 20 }} />
                          <Typography variant="body2" sx={{ color: "#2196F3", fontWeight: 600 }}>
                            {new Date(profile.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Action Buttons */}
                  <Box sx={{ 
                    display: "flex", 
                    gap: 2, 
                    mt: "auto",
                    pt: 3,
                    justifyContent: "flex-end"
                  }}>
                    <ActionButton
                      variant="outlined"
                      onClick={() => navigate("/dashboard")}
                      startIcon={<Cancel />}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      type="submit"
                      variant="contained"
                      disabled={updating || uploading}
                      startIcon={<Save />}
                    >
                      {updating ? "Updating..." : "Save Changes"}
                    </ActionButton>
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>
          </Grid>
        </form>

        {/* Danger Zone */}
        {/* <GlassCard sx={{ 
          mt: 4,
          border: "1px solid rgba(244, 67, 54, 0.3)",
          background: "rgba(244, 67, 54, 0.05)",
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Warning sx={{ fontSize: 28, color: "#f44336" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#f44336" }}>
                Danger Zone
              </Typography>
            </Box>

            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" }, 
              gap: 3, 
              alignItems: { xs: "flex-start", sm: "center" },
              p: 3,
              borderRadius: 2,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(244, 67, 54, 0.2)",
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: "#e3f2fd", mb: 2, fontWeight: 600 }}>
                  Deactivate Account
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
                  Once you deactivate your account, you will be logged out and your
                  account will be disabled. This action can be reversed later by
                  contacting support or logging in again.
                </Typography>
                <Typography variant="body2" sx={{ 
                  opacity: 0.7, 
                  mt: 2, 
                  fontStyle: "italic",
                  color: "#f44336"
                }}>
                  ⚠️ This action requires confirmation and will immediately log you out.
                </Typography>
              </Box>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: { xs: "stretch", sm: "center" },
                minWidth: { sm: "200px" }
              }}>
                <DangerButton
                  onClick={handleDeactivateAccount}
                  disabled={updating}
                  startIcon={<Security />}
                  fullWidth
                  size="large"
                >
                  Deactivate Account
                </DangerButton>
                {updating && (
                  <Typography variant="caption" sx={{ 
                    mt: 1, 
                    opacity: 0.8,
                    textAlign: "center" 
                  }}>
                    Processing...
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </GlassCard> */}
      </Box>
    </Box>
  );
};

export default ProfilePage;
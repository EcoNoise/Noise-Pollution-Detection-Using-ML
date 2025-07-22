"""
Django Views for Noise Detection API
"""

import time
import logging
from datetime import datetime

from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from .ml_models import ModelManager
from .utils import AudioProcessor
from .models import PredictionHistory, NoiseArea, HealthProfile, ExposureLog
from .serializers import RegisterSerializer, UserSerializer, NoiseAreaSerializer, HealthProfileSerializer, ExposureLogSerializer, WeeklySummarySerializer

logger = logging.getLogger(__name__)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser

class HealthView(APIView):
    """Health check endpoint"""

    def get(self, request):
        return Response(
            {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "service": "Noise Detection API",
            }
        )


class ModelStatusView(APIView):
    """Check ML models status"""

    def get(self, request):
        try:
            model_manager = ModelManager.get_instance()
            model_info = model_manager.get_model_info()

            return Response(
                {
                    "status": "success",
                    "models": model_info["status"],
                    "source_classes": model_info["source_classes"],
                    "health_labels": model_info["health_labels"],
                    "total_models": len(model_info["status"]),
                    "loaded_models": sum(model_info["status"].values()),
                    "total_source_classes": model_info["total_source_classes"],
                }
            )

        except Exception as e:
            logger.error(f"Model status error: {e}")
            return Response(
                {"status": "error", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AudioUploadPredictionView(APIView):
    """Handle audio file upload and prediction"""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        start_time = time.time()

        try:
            # Validate file upload
            if "audio_file" not in request.FILES:
                return Response(
                    {"status": "error", "error": "No audio file provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            audio_file = request.FILES["audio_file"]

            # Validate file size
            if audio_file.size > settings.AUDIO_UPLOAD_MAX_SIZE:
                return Response(
                    {
                        "status": "error",
                        "error": f"File too large. Max size: {settings.AUDIO_UPLOAD_MAX_SIZE / (1024 * 1024)}MB",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate file format
            file_extension = "." + audio_file.name.split(".")[-1].lower()
            if file_extension not in settings.ALLOWED_AUDIO_FORMATS:
                return Response(
                    {
                        "status": "error",
                        "error": f"Unsupported format. Allowed: {settings.ALLOWED_AUDIO_FORMATS}",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Process audio
            processor = AudioProcessor()
            try:
                features = processor.process_audio_file(audio_file)
            except Exception as e:
                logger.error(f"Audio processing error: {e}")
                return Response(
                    {
                        "status": "error",
                        "error": f"Failed to process audio file: {str(e)}",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get predictions
            model_manager = ModelManager.get_instance()
            try:
                predictions = model_manager.predict_all(features)
            except Exception as e:
                logger.error(f"Model prediction error: {e}")
                # Provide fallback predictions
                predictions = {
                    "noise_level": 65.0,
                    "noise_source": "unknown",
                    "health_impact": "Moderate",
                    "confidence_score": 0.1,
                    "status": "success",
                    "note": "Used fallback predictions due to model error",
                }

            if predictions.get("status") == "error":
                # Convert error to fallback prediction
                predictions = {
                    "noise_level": 65.0,
                    "noise_source": "unknown",
                    "health_impact": "Moderate",
                    "confidence_score": 0.1,
                    "status": "success",
                    "note": "Used fallback predictions due to model compatibility issues",
                }

            # Calculate processing time
            processing_time = time.time() - start_time

            # Save to history
            try:
                PredictionHistory.objects.create(
                    noise_level=predictions["noise_level"],
                    noise_source=predictions["noise_source"],
                    health_impact=predictions["health_impact"],
                    confidence_score=predictions["confidence_score"],
                    file_name=audio_file.name,
                    processing_time=processing_time,
                )
            except Exception as e:
                logger.warning(f"Failed to save prediction history: {e}")

            # Return results
            return Response(
                {
                    "status": "success",
                    "predictions": predictions,
                    "processing_time": round(processing_time, 3),
                    "file_info": {"name": audio_file.name, "size": audio_file.size},
                }
            )

        except Exception as e:
            logger.error(f"Prediction error: {e}")

            # Provide fallback response instead of error
            fallback_predictions = {
                "noise_level": 65.0,
                "noise_source": "unknown",
                "health_impact": "Moderate",
                "confidence_score": 0.1,
                "status": "success",
                "note": f"Used fallback predictions due to system error: {str(e)[:100]}",
            }

            processing_time = time.time() - start_time

            return Response(
                {
                    "status": "success",
                    "predictions": fallback_predictions,
                    "processing_time": round(processing_time, 3),
                    "file_info": {"name": audio_file.name, "size": audio_file.size},
                }
            )


class PredictionHistoryView(APIView):
    """Get prediction history"""

    def get(self, request):
        try:
            limit = min(int(request.GET.get("limit", 50)), 100)  # Max 100

            history = PredictionHistory.objects.all()[:limit]

            data = [
                {
                    "id": item.id,
                    "timestamp": item.timestamp.isoformat(),
                    "noise_level": item.noise_level,
                    "noise_source": item.noise_source,
                    "health_impact": item.health_impact,
                    "confidence_score": item.confidence_score,
                    "file_name": item.file_name,
                    "processing_time": item.processing_time,
                }
                for item in history
            ]

            return Response({"status": "success", "history": data, "total": len(data)})

        except Exception as e:
            logger.error(f"History error: {e}")
            return Response(
                {"status": "error", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BatchPredictionView(APIView):
    """Handle batch audio prediction"""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            files = request.FILES.getlist("audio_files")

            if not files:
                return Response(
                    {"status": "error", "error": "No audio files provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(files) > 10:  # Limit batch size
                return Response(
                    {
                        "status": "error",
                        "error": "Too many files. Max 10 files per batch",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            results = []
            processor = AudioProcessor()
            model_manager = ModelManager.get_instance()

            for audio_file in files:
                try:
                    # Process each file
                    features = processor.process_audio_file(audio_file)
                    predictions = model_manager.predict_all(features)

                    results.append(
                        {
                            "file_name": audio_file.name,
                            "predictions": predictions,
                            "status": "success",
                        }
                    )

                except Exception as e:
                    results.append(
                        {
                            "file_name": audio_file.name,
                            "error": str(e),
                            "status": "error",
                        }
                    )

            return Response(
                {
                    "status": "success",
                    "results": results,
                    "total_files": len(files),
                    "successful": len([r for r in results if r["status"] == "success"]),
                }
            )

        except Exception as e:
            logger.error(f"Batch prediction error: {e}")
            return Response(
                {"status": "error", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
class RegisterView(APIView):
    """
    Registrasi user baru dengan foto profil.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Salin data request agar bisa dimodifikasi
        data = request.data.copy()

        # --- PERBAIKAN UTAMA ---
        # Petakan field dari camelCase (frontend) ke snake_case (backend)
        # Ini menyelesaikan masalah first_name dan last_name yang NULL
        if 'firstName' in data:
            data['first_name'] = data.pop('firstName')[0]
        if 'lastName' in data:
            data['last_name'] = data.pop('lastName')[0]
        
        # Penanganan khusus untuk foto yang berada di dalam nested object 'profile'
        if 'profile.photo' in data:
            photo_file = data.pop('profile.photo')[0]
            data['photo'] = photo_file

        # Pass data yang sudah dimodifikasi ke serializer
        # Tambahkan context={'request': request} agar URL foto bisa dibuat dengan benar
        serializer = RegisterSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)

            photo_url = None
            if user.photo:
                # Dapatkan URL absolut dari foto profil
                photo_url = request.build_absolute_uri(user.photo.url)

            return Response({
                "status": "success",
                "message": "User berhasil dibuat.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "photo": photo_url
                },
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    Login user dan mendapatkan token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate

        # Terima field 'username' atau 'loginField' dari frontend
        login_field = request.data.get("username") or request.data.get("loginField")
        password = request.data.get("password")

        if not login_field or not password:
            return Response(
                {"error": "Username/email dan password harus diisi"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Gunakan custom authentication backend yang mendukung email atau username
        user = authenticate(username=login_field, password=password)

        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                "status": "success",
                "message": "Login berhasil.",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            })

        return Response(
            {"error": "Username/email atau password salah"}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

class RefreshTokenView(APIView):
    """
    Refresh access token menggunakan refresh token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError

        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {"error": "Refresh token diperlukan"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refresh = RefreshToken(refresh_token)
            new_access_token = str(refresh.access_token)
            
            # Jika ROTATE_REFRESH_TOKENS True, generate refresh token baru
            new_refresh_token = str(refresh)
            
            return Response({
                "status": "success",
                "access": new_access_token,
                "refresh": new_refresh_token,
            }, status=status.HTTP_200_OK)
            
        except TokenError as e:
            return Response(
                {"error": "Refresh token tidak valid atau sudah expired"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    
class UserProfileView(APIView):
    """
    Mengambil atau memperbarui data profil user yang sedang login.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] # Tambahkan ini untuk handle file upload

    def get(self, request):
        """Mengembalikan data user yang terotentikasi."""
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """Memperbarui data user yang terotentikasi."""
        user = request.user
        data = request.data

        # Update field User model
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        
        # Update foto langsung di User model
        if 'photo' in data:
            user.photo = data['photo']
            
        user.save()

        # Kembalikan data yang sudah diperbarui
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class NoiseAreaListCreateView(APIView):
    """
    GET: Mengambil semua area noise (semua user bisa lihat)
    POST: Membuat area noise baru (hanya user yang login)
    """
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.request.method == 'GET':
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def get(self, request):
        """Mengambil semua area noise dari semua user"""
        try:
            areas = NoiseArea.objects.all()
            serializer = NoiseAreaSerializer(areas, many=True, context={'request': request})
            return Response({
                "status": "success",
                "areas": serializer.data,
                "total": areas.count()
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching noise areas: {e}")
            return Response({
                "status": "error",
                "error": "Gagal mengambil data area noise"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Membuat area noise baru"""
        try:
            print(f"🔍 Data yang diterima backend: {request.data}")
            print(f"🔍 User yang login: {request.user}")
            print(f"🔍 User authenticated: {request.user.is_authenticated}")
            
            serializer = NoiseAreaSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                area = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Area noise berhasil ditambahkan",
                    "area": NoiseAreaSerializer(area, context={'request': request}).data
                }, status=status.HTTP_201_CREATED)
            else:
                print(f"❌ Serializer errors: {serializer.errors}")
                return Response({
                    "status": "error",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating noise area: {e}")
            print(f"❌ Exception: {e}")
            return Response({
                "status": "error",
                "error": "Gagal membuat area noise"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NoiseAreaDetailView(APIView):
    """
    GET: Mengambil detail area noise
    PUT: Update area noise (hanya pemilik)
    DELETE: Hapus area noise (hanya pemilik)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        """Helper method untuk mendapatkan object NoiseArea"""
        try:
            return NoiseArea.objects.get(pk=pk)
        except NoiseArea.DoesNotExist:
            return None

    def get(self, request, pk):
        """Mengambil detail area noise"""
        area = self.get_object(pk)
        if not area:
            return Response({
                "status": "error",
                "error": "Area noise tidak ditemukan"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = NoiseAreaSerializer(area, context={'request': request})
        return Response({
            "status": "success",
            "area": serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """Update area noise (hanya pemilik)"""
        area = self.get_object(pk)
        if not area:
            return Response({
                "status": "error",
                "error": "Area noise tidak ditemukan"
            }, status=status.HTTP_404_NOT_FOUND)

        # Cek apakah user adalah pemilik area
        if area.user != request.user:
            return Response({
                "status": "error",
                "error": "Anda tidak memiliki izin untuk mengubah area ini"
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = NoiseAreaSerializer(area, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_area = serializer.save()
            return Response({
                "status": "success",
                "message": "Area noise berhasil diperbarui",
                "area": NoiseAreaSerializer(updated_area, context={'request': request}).data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Hapus area noise (hanya pemilik)"""
        area = self.get_object(pk)
        if not area:
            return Response({
                "status": "error",
                "error": "Area noise tidak ditemukan"
            }, status=status.HTTP_404_NOT_FOUND)

        # Cek apakah user adalah pemilik area
        if area.user != request.user:
            return Response({
                "status": "error",
                "error": "Anda tidak memiliki izin untuk menghapus area ini"
            }, status=status.HTTP_403_FORBIDDEN)

        area.delete()
        return Response({
            "status": "success",
            "message": "Area noise berhasil dihapus"
        }, status=status.HTTP_200_OK)


class UserNoiseAreasView(APIView):
    """
    Mengambil semua area noise yang dibuat oleh user yang sedang login
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Mengambil area noise milik user yang login"""
        try:
            areas = NoiseArea.objects.filter(user=request.user)
            serializer = NoiseAreaSerializer(areas, many=True, context={'request': request})
            return Response({
                "status": "success",
                "areas": serializer.data,
                "total": areas.count()
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching user noise areas: {e}")
            return Response({
                "status": "error",
                "error": "Gagal mengambil data area noise user"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== HEALTH DASHBOARD VIEWS =====

class HealthProfileView(APIView):
    """
    GET: Mengambil health profile user
    POST: Membuat health profile baru
    PUT: Update health profile
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Mengambil health profile user"""
        try:
            profile, created = HealthProfile.objects.get_or_create(user=request.user)
            serializer = HealthProfileSerializer(profile, context={'request': request})
            return Response({
                "status": "success",
                "profile": serializer.data,
                "is_new": created
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching health profile: {e}")
            return Response({
                "status": "error",
                "error": "Gagal mengambil data health profile"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        """Update health profile"""
        try:
            profile, created = HealthProfile.objects.get_or_create(user=request.user)
            serializer = HealthProfileSerializer(profile, data=request.data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                updated_profile = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Health profile berhasil diperbarui",
                    "profile": HealthProfileSerializer(updated_profile, context={'request': request}).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "status": "error",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating health profile: {e}")
            return Response({
                "status": "error",
                "error": "Gagal memperbarui health profile"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExposureLogView(APIView):
    """
    GET: Mengambil exposure logs user
    POST: Membuat exposure log baru
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Mengambil exposure logs user dengan filter tanggal"""
        try:
            from datetime import datetime, timedelta
            
            # Get query parameters
            days = int(request.GET.get('days', 7))  # Default 7 hari
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days-1)
            
            logs = ExposureLog.objects.filter(
                user=request.user,
                date__range=[start_date, end_date]
            ).order_by('-date')
            
            serializer = ExposureLogSerializer(logs, many=True, context={'request': request})
            return Response({
                "status": "success",
                "logs": serializer.data,
                "total": logs.count(),
                "date_range": {
                    "start": start_date,
                    "end": end_date
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching exposure logs: {e}")
            return Response({
                "status": "error",
                "error": "Gagal mengambil data exposure logs"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Membuat atau update exposure log untuk tanggal tertentu"""
        try:
            from datetime import datetime
            
            # Get date from request or use today
            log_date = request.data.get('date', datetime.now().date())
            if isinstance(log_date, str):
                log_date = datetime.strptime(log_date, '%Y-%m-%d').date()
            
            # Check if log already exists for this date
            try:
                existing_log = ExposureLog.objects.get(user=request.user, date=log_date)
                # Update existing log
                serializer = ExposureLogSerializer(existing_log, data=request.data, partial=True, context={'request': request})
                if serializer.is_valid():
                    log = serializer.save()
                    return Response({
                        "status": "success",
                        "message": "Exposure log berhasil diperbarui",
                        "log": ExposureLogSerializer(log, context={'request': request}).data,
                        "is_new": False
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "status": "error",
                        "error": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except ExposureLog.DoesNotExist:
                # Create new log
                serializer = ExposureLogSerializer(data=request.data, context={'request': request})
                if serializer.is_valid():
                    log = serializer.save()
                    return Response({
                        "status": "success",
                        "message": "Exposure log berhasil dibuat",
                        "log": ExposureLogSerializer(log, context={'request': request}).data,
                        "is_new": True
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        "status": "error",
                        "error": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error creating/updating exposure log: {e}")
            return Response({
                "status": "error",
                "error": "Gagal menyimpan exposure log"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WeeklySummaryView(APIView):
    """
    GET: Mengambil weekly summary untuk health dashboard
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Generate weekly summary"""
        try:
            from datetime import datetime, timedelta
            from django.db.models import Avg, Count
            
            # Get week range
            today = datetime.now().date()
            week_start = today - timedelta(days=today.weekday())  # Monday
            week_end = week_start + timedelta(days=6)  # Sunday
            
            # Get exposure logs for this week
            logs = ExposureLog.objects.filter(
                user=request.user,
                date__range=[week_start, week_end]
            ).order_by('date')
            
            # Calculate weekly averages
            weekly_stats = logs.aggregate(
                avg_noise=Avg('weighted_avg_noise'),
                total_logs=Count('id')
            )
            
            # Generate daily data for missing days
            daily_exposures = []
            current_date = week_start
            
            while current_date <= week_end:
                try:
                    log = logs.get(date=current_date)
                    daily_exposures.append(log)
                except ExposureLog.DoesNotExist:
                    # Create default log for missing day
                    health_profile = getattr(request.user, 'health_profile', None)
                    
                    default_log = ExposureLog(
                        user=request.user,
                        date=current_date,
                        home_avg_noise=health_profile.home_avg_noise if health_profile else 50,
                        work_avg_noise=health_profile.work_avg_noise if health_profile else 60,
                    )
                    daily_exposures.append(default_log)
                
                current_date += timedelta(days=1)
            
            # Count total alerts
            total_alerts = sum(len(log.health_alerts) for log in daily_exposures)
            
            # Generate recommendations
            recommendations = []
            avg_noise = weekly_stats['avg_noise'] or 55
            
            if avg_noise > 70:
                recommendations.append("Try noise-cancelling headphones")
                recommendations.append("Consider quieter routes for commuting")
            elif avg_noise > 60:
                recommendations.append("Weekend recovery recommended")
            else:
                recommendations.append("Good noise exposure levels!")
            
            # Prepare response data
            summary_data = {
                "week_start": week_start,
                "week_end": week_end,
                "daily_exposures": daily_exposures,
                "weekly_avg_noise": round(avg_noise, 1),
                "total_alerts": total_alerts,
                "recommendations": recommendations
            }
            
            serializer = WeeklySummarySerializer(summary_data)
            return Response({
                "status": "success",
                "summary": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating weekly summary: {e}")
            return Response({
                "status": "error",
                "error": "Gagal membuat weekly summary"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HealthDashboardView(APIView):
    """
    GET: Mengambil semua data untuk health dashboard
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get complete health dashboard data"""
        try:
            from datetime import datetime, timedelta
            
            # Get health profile
            health_profile, _ = HealthProfile.objects.get_or_create(user=request.user)
            
            # Get recent exposure logs (7 days)
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=6)
            
            recent_logs = ExposureLog.objects.filter(
                user=request.user,
                date__range=[start_date, end_date]
            ).order_by('-date')
            
            # Generate missing logs with defaults
            existing_dates = set(log.date for log in recent_logs)
            all_logs = list(recent_logs)
            
            current_date = start_date
            while current_date <= end_date:
                if current_date not in existing_dates:
                    default_log = ExposureLog(
                        user=request.user,
                        date=current_date,
                        home_avg_noise=health_profile.home_avg_noise,
                        work_avg_noise=health_profile.work_avg_noise,
                    )
                    all_logs.append(default_log)
                current_date += timedelta(days=1)
            
            # Sort by date
            all_logs.sort(key=lambda x: x.date, reverse=True)
            
            # Calculate summary stats
            total_alerts = sum(len(log.health_alerts) for log in all_logs)
            avg_noise = sum(log.weighted_avg_noise for log in all_logs) / len(all_logs) if all_logs else 55
            
            return Response({
                "status": "success",
                "dashboard": {
                    "profile": HealthProfileSerializer(health_profile, context={'request': request}).data,
                    "recent_logs": ExposureLogSerializer(all_logs, many=True, context={'request': request}).data,
                    "summary": {
                        "avg_noise_7days": round(avg_noise, 1),
                        "total_alerts": total_alerts,
                        "tracking_enabled": health_profile.tracking_enabled
                    }
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching health dashboard: {e}")
            return Response({
                "status": "error",
                "error": "Gagal mengambil data health dashboard"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

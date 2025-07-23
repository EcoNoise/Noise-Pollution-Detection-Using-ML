from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import NoiseArea, HealthProfile, ExposureLog

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    photo = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ('username', 'password', 'first_name', 'last_name', 'email', 'photo')

    def create(self, validated_data):
        photo = validated_data.pop('photo', None)

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            photo=photo
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer untuk User dengan foto profil"""
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'photo','date_joined', 'last_login', 'is_active')

    def to_representation(self, instance):
        """Ubah representasi untuk menyertakan URL foto."""
        representation = super().to_representation(instance)

        # Jika ada foto, sertakan URL lengkapnya
        if representation.get('photo'):
            request = self.context.get('request')
            if request:
                representation['photo'] = request.build_absolute_uri(representation['photo'])
        else:
            representation['photo'] = None

        return representation


class NoiseAreaSerializer(serializers.ModelSerializer):
    """Serializer untuk NoiseArea dengan informasi user dan warna otomatis"""
    
    user_info = serializers.SerializerMethodField()
    color = serializers.ReadOnlyField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = NoiseArea
        fields = [
            'id', 'latitude', 'longitude', 'noise_level', 'noise_source', 
            'health_impact', 'description', 'address', 'radius', 
            'created_at', 'updated_at', 'user_info', 'color', 'can_delete'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_info', 'color', 'can_delete']
    
    def get_user_info(self, obj):
        """Mengembalikan informasi user yang membuat area"""
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name
        }
    
    def get_can_delete(self, obj):
        """Menentukan apakah user saat ini bisa menghapus area ini"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False
    
    def create(self, validated_data):
        """Override create untuk menambahkan user dari request"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Override update untuk memastikan user tetap sama"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().update(instance, validated_data)


class HealthProfileSerializer(serializers.ModelSerializer):
    """Serializer untuk HealthProfile dengan calculated fields"""
    
    home_avg_noise = serializers.ReadOnlyField()
    work_avg_noise = serializers.ReadOnlyField()
    
    # Frontend compatibility fields
    home_zone_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    home_zone_lat = serializers.FloatField(write_only=True, required=False)
    home_zone_lng = serializers.FloatField(write_only=True, required=False)
    work_zone_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    work_zone_lat = serializers.FloatField(write_only=True, required=False)
    work_zone_lng = serializers.FloatField(write_only=True, required=False)
    
    class Meta:
        model = HealthProfile
        fields = [
            'id', 'home_latitude', 'home_longitude', 'home_address',
            'work_latitude', 'work_longitude', 'work_address',
            'tracking_enabled', 'home_avg_noise', 'work_avg_noise',
            'created_at', 'updated_at',
            # Frontend compatibility fields
            'home_zone_address', 'home_zone_lat', 'home_zone_lng',
            'work_zone_address', 'work_zone_lat', 'work_zone_lng'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'home_avg_noise', 'work_avg_noise']
    
    def validate(self, data):
        """Map frontend field names to backend field names"""
        # Map frontend fields to backend fields
        if 'home_zone_address' in data:
            data['home_address'] = data.pop('home_zone_address')
        if 'home_zone_lat' in data:
            data['home_latitude'] = data.pop('home_zone_lat')
        if 'home_zone_lng' in data:
            data['home_longitude'] = data.pop('home_zone_lng')
        if 'work_zone_address' in data:
            data['work_address'] = data.pop('work_zone_address')
        if 'work_zone_lat' in data:
            data['work_latitude'] = data.pop('work_zone_lat')
        if 'work_zone_lng' in data:
            data['work_longitude'] = data.pop('work_zone_lng')
        
        return data
    
    def to_representation(self, instance):
        """Map backend field names to frontend field names for output"""
        representation = super().to_representation(instance)
        
        # Add frontend-compatible field names for output
        representation['home_zone_address'] = representation.get('home_address', '')
        representation['home_zone_lat'] = representation.get('home_latitude', 0)
        representation['home_zone_lng'] = representation.get('home_longitude', 0)
        representation['work_zone_address'] = representation.get('work_address', '')
        representation['work_zone_lat'] = representation.get('work_latitude', 0)
        representation['work_zone_lng'] = representation.get('work_longitude', 0)
        
        return representation
    
    def create(self, validated_data):
        """Override create untuk menambahkan user dari request"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Override update untuk memastikan user tetap sama"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().update(instance, validated_data)


class ExposureLogSerializer(serializers.ModelSerializer):
    """Serializer untuk ExposureLog dengan calculated fields"""
    
    total_exposure_hours = serializers.ReadOnlyField()
    weighted_avg_noise = serializers.ReadOnlyField()
    health_alerts = serializers.ReadOnlyField()
    
    # Frontend compatibility fields
    home_hours = serializers.FloatField(write_only=True, required=False)
    work_hours = serializers.FloatField(write_only=True, required=False)
    commute_hours = serializers.FloatField(write_only=True, required=False)
    
    class Meta:
        model = ExposureLog
        fields = [
            'id', 'date', 'home_exposure_hours', 'work_exposure_hours', 
            'commute_exposure_minutes', 'home_avg_noise', 'work_avg_noise', 
            'commute_avg_noise', 'total_exposure_hours', 'weighted_avg_noise',
            'health_alerts', 'created_at', 'updated_at',
            # Frontend compatibility fields
            'home_hours', 'work_hours', 'commute_hours'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_exposure_hours', 
                           'weighted_avg_noise', 'health_alerts']
    
    def validate(self, data):
        """Map frontend field names to backend field names"""
        # Map frontend fields to backend fields
        if 'home_hours' in data:
            data['home_exposure_hours'] = data.pop('home_hours')
        if 'work_hours' in data:
            data['work_exposure_hours'] = data.pop('work_hours')
        if 'commute_hours' in data:
            # Convert hours to minutes for commute
            data['commute_exposure_minutes'] = data.pop('commute_hours') * 60
        
        return data
    
    def to_representation(self, instance):
        """Map backend field names to frontend field names for output"""
        representation = super().to_representation(instance)
        
        # Add frontend-compatible field names for output
        representation['home_hours'] = representation.get('home_exposure_hours', 0)
        representation['work_hours'] = representation.get('work_exposure_hours', 0)
        representation['commute_hours'] = (representation.get('commute_exposure_minutes', 0) or 0) / 60
        
        return representation
    
    def create(self, validated_data):
        """Override create untuk menambahkan user dari request"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Override update untuk memastikan user tetap sama"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().update(instance, validated_data)


class WeeklySummarySerializer(serializers.Serializer):
    """Serializer untuk weekly summary data"""
    
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    daily_exposures = ExposureLogSerializer(many=True)
    weekly_avg_noise = serializers.FloatField()
    total_alerts = serializers.IntegerField()
    recommendations = serializers.ListField(child=serializers.CharField())
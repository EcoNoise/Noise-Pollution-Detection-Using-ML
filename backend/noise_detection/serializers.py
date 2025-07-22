from rest_framework import serializers
from .models import CustomUser, NoiseArea

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    photo = serializers.ImageField(required=False)

    class Meta:
        model = CustomUser
        fields = ('username', 'password', 'first_name', 'last_name', 'email', 'photo')

    def create(self, validated_data):
        photo = validated_data.pop('photo', None)

        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            photo=photo
        )

        return user

class UserSerializer(serializers.ModelSerializer):
    """Serializer untuk menampilkan data detail user."""

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'photo')

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
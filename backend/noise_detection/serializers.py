from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('photo',)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    profile = ProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ('username', 'password', 'first_name', 'last_name', 'email', 'profile')

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', '')
        )

        if profile_data:
            Profile.objects.update_or_create(user=user, defaults=profile_data)

        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('photo',)

class UserSerializer(serializers.ModelSerializer):
    """Serializer untuk menampilkan data detail user."""
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')

    def to_representation(self, instance):
        """Ubah representasi untuk menyertakan URL foto."""
        representation = super().to_representation(instance)
        profile_data = representation.pop('profile')

        # Jika ada foto, sertakan URL lengkapnya
        if profile_data and profile_data.get('photo'):
            request = self.context.get('request')
            representation['photo'] = request.build_absolute_uri(profile_data['photo'])
        else:
            representation['photo'] = None

        return representation
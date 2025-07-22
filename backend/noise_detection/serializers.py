from rest_framework import serializers
from .models import CustomUser

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
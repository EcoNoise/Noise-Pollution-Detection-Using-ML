from django.core.management.base import BaseCommand
from django.utils import timezone
from noise_detection.models import NoiseArea


class Command(BaseCommand):
    help = 'Cleanup expired noise areas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get expired areas
        expired_areas = NoiseArea.objects.filter(
            expires_at__lte=timezone.now()
        )
        
        count = expired_areas.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would delete {count} expired noise areas')
            )
            for area in expired_areas[:10]:  # Show first 10
                self.stdout.write(f'  - Area {area.id}: {area.noise_source} (expired: {area.expires_at})')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
        else:
            # Actually delete
            deleted_count = NoiseArea.cleanup_expired_areas()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted_count} expired noise areas')
            )
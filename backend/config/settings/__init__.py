import os

# Default to development settings if not specified
env_name = os.getenv('DJANGO_ENV', 'development')
if env_name == 'production':
    from .production import *
else:
    from .development import *

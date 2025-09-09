# 🎵 Noise Pollution Detection System

Sistem deteksi dan analisis polusi suara menggunakan Machine Learning dengan arsitektur fullstack modern.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Django](https://img.shields.io/badge/Django-4.2+-green.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)

## 🏗️ Arsitektur Sistem

- **Backend**: Django REST API dengan MySQL database
- **Frontend**: React TypeScript dengan Material-UI components
- **ML Models**: CatBoost dengan optimasi algoritma bio-inspired
- **Audio Processing**: Librosa untuk ekstraksi fitur audio

## ✨ Fitur Utama

- 🔊 **Upload & Analisis Audio**: Drag & drop file audio untuk analisis real-time
- 📊 **Prediksi Noise Level**: Prediksi tingkat kebisingan dalam decibel (dB)
- 🏭 **Klasifikasi Sumber**: Identifikasi sumber kebisingan (traffic, construction, industrial, dll)
- 🏥 **Analisis Dampak Kesehatan**: Evaluasi potensi dampak kesehatan dari tingkat kebisingan
- 📈 **Dashboard Real-time**: Visualisasi data dan analytics dengan charts interaktif
- 📝 **History & Tracking**: Riwayat analisis dan tracking perubahan dari waktu ke waktu
- 🎯 **Model Optimization**: Model ML yang dioptimasi menggunakan algoritma Firefly & Fruit Fly
- 🔄 **REST API**: API endpoints lengkap untuk integrasi dengan sistem lain

## 🚀 Quick Start

### 📋 Prerequisites

Pastikan Anda sudah menginstall:
- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **MySQL 8.0+** ([Download](https://dev.mysql.com/downloads/mysql/))
- **Git** ([Download](https://git-scm.com/downloads))

### 🔧 Installation

#### 1. Clone Repository
```bash
git clone https://github.com/yourusername/noise-pollution-detection.git
cd noise-pollution-detection
```

#### 2. Setup Database (MySQL)
```sql
-- Buat database MySQL
CREATE DATABASE econoise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Buat user (opsional)
CREATE USER 'econoise_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON econoise_db.* TO 'econoise_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. Setup Backend (Django)
```bash
# Masuk ke folder backend
cd backend

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env file dengan konfigurasi database Anda

# Jalankan migrasi database
python manage.py migrate

# Buat superuser (opsional)
python manage.py createsuperuser

# Test server
python manage.py runserver
```

Backend akan berjalan di: http://localhost:8000

#### 4. Setup Frontend (React)
```bash
# Buka terminal baru, masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env file jika diperlukan

# Start development server
npm start
```

Frontend akan berjalan di: http://localhost:3000

### 🎯 Testing Installation

1. **Backend API Test**:
   ```bash
   curl http://localhost:8000/api/health/
   # Should return: {"status":"healthy","timestamp":"...","service":"Noise Detection API"}
   ```

2. **Frontend Test**: 
   - Buka browser ke http://localhost:3000
   - Anda akan melihat halaman upload dengan interface Material-UI

3. **ML Models Test**:
   ```bash
   curl http://localhost:8000/api/models/status/
   # Should return model loading status
   ```

## 🔧 Configuration

### Backend Environment (.env)
```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database (MySQL)
DB_NAME=econoise_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306

# CORS (untuk frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend Environment (.env)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api

# App Info
REACT_APP_APP_NAME=Noise Pollution Detection System
REACT_APP_VERSION=1.0.0
```

## 📊 API Documentation

### Core Endpoints

#### Health Check
```http
GET /api/health/
```
Response: Service health status

#### Model Status
```http
GET /api/models/status/
```
Response: ML models loading status

#### Audio Analysis
```http
POST /api/noise-detection/upload/
Content-Type: multipart/form-data

Body: audio file (WAV, MP3, FLAC, M4A)
```
Response: 
```json
{
  "noise_level": 65.5,
  "noise_source": "traffic",
  "health_impact": "moderate",
  "confidence": 0.85,
  "timestamp": "2025-07-07T20:30:00Z"
}
```

#### Analysis History
```http
GET /api/noise-detection/history/
```
Response: List of previous analyses

### Supported Audio Formats
- **WAV** (recommended)
- **MP3**
- **FLAC** 
- **M4A**

Max file size: 50MB

## 🧠 Machine Learning Models

### Model Architecture
1. **Noise Level Prediction**: Prediksi tingkat dB menggunakan CatBoost Regressor
2. **Noise Source Classification**: Klasifikasi 10 kategori sumber kebisingan
3. **Health Impact Assessment**: Evaluasi dampak kesehatan berdasarkan WHO guidelines
4. **Optimized Models**: Model yang dioptimasi menggunakan Firefly & Fruit Fly algorithms

### Feature Extraction
- **MFCC (Mel-frequency cepstral coefficients)**
- **Spectral features** (centroid, bandwidth, rolloff)
- **Zero Crossing Rate**
- **RMS Energy**
- **Chroma features**

### Model Performance
- **Noise Level**: MAE < 3 dB, R² > 0.90
- **Source Classification**: Accuracy > 88%
- **Health Impact**: Precision > 85%

## 📁 Project Structure

```
noise-pollution-detection/
├── backend/                    # Django REST API
│   ├── noise_detection/       # Main Django app
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API views
│   │   ├── urls.py            # URL routing
│   │   └── ml_models.py       # ML model loading
│   ├── ml_models/             # Trained ML models (.pkl files)
│   ├── requirements.txt       # Python dependencies
│   ├── manage.py              # Django management
│   └── .env                   # Environment variables
├── frontend/                   # React TypeScript app
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── HomePage.tsx   # Main upload interface
│   │   │   ├── HistoryPage.tsx # Analysis history
│   │   │   └── StatusPage.tsx # System status
│   │   ├── services/          # API service layer
│   │   │   └── api.ts         # API client
│   │   └── utils/             # Utility functions
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Environment variables
├── .github/                    # GitHub templates & workflows
│   ├── workflows/             # CI/CD pipeline
│   └── ISSUE_TEMPLATE/        # Issue templates
├── .gitignore                 # Git ignore rules
├── .gitattributes             # Git attributes
├── README.md                  # This file
└── CONTRIBUTORS.md            # Contributors info
```

## 🛠️ Development

### Available Scripts

#### Backend (Django)
```bash
cd backend

# Run development server
python manage.py runserver

# Run database migrations
python manage.py migrate

# Create new migrations
python manage.py makemigrations

# Run tests
python manage.py test

# Django shell
python manage.py shell

# Collect static files (production)
python manage.py collectstatic
```

#### Frontend (React)
```bash
cd frontend

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint --if-present
```

### Code Quality Tools

#### Python (Backend)
```bash
# Code formatting
black backend/

# Import sorting
isort backend/

# Linting
flake8 backend/

# Security check
bandit -r backend/
```

#### TypeScript (Frontend)
```bash
# Type checking
npx tsc --noEmit

# ESLint
npx eslint src/

# Prettier
npx prettier --write src/
```

## 🚀 Production Deployment

### Backend (Django)
1. Set `DEBUG=False` in `.env`
2. Configure proper `SECRET_KEY`
3. Setup MySQL database with proper credentials
4. Run `python manage.py collectstatic`
5. Use production WSGI server (gunicorn, uWSGI)
6. Configure reverse proxy (nginx, Apache)

### Frontend (React)
1. Run `npm run build`
2. Serve static files from `build/` directory
3. Configure proper API URL in production `.env`
4. Setup CDN for static assets (optional)

### Environment Variables (Production)
```env
# Backend
DEBUG=False
SECRET_KEY=your-secure-production-key
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-db-password
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Frontend
REACT_APP_API_URL=https://api.yourdomain.com
```

## 📊 Monitoring & Analytics

### Available Metrics
- **Upload Volume**: Total files processed
- **Processing Time**: Average analysis duration
- **Model Performance**: Prediction accuracy metrics
- **Error Rates**: API error tracking
- **User Activity**: Usage patterns and trends

### System Status Page
Visit `/status` untuk melihat:
- ✅ ML model loading status
- 📊 System performance metrics
- 🔧 Health check results
- 📈 Real-time statistics

## 🤝 Contributing

Kami menyambut kontribusi dari siapa pun! Lihat [CONTRIBUTORS.md](CONTRIBUTORS.md) untuk panduan lengkap.

### Quick Contribution Steps
1. Fork repository ini
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

### Development Setup
1. Follow installation steps di atas
2. Install pre-commit hooks: `pre-commit install`
3. Run tests sebelum commit
4. Follow coding standards (Black, ESLint)

## 🆘 Support & Help

### Common Issues

#### Backend Issues
- **Port already in use**: Ganti port dengan `python manage.py runserver 8001`
- **Database connection error**: Periksa MySQL service dan kredensial di `.env`
- **Missing dependencies**: Run `pip install -r requirements.txt`

#### Frontend Issues
- **Node modules error**: Hapus `node_modules/` dan run `npm install`
- **Port 3000 in use**: React akan otomatis suggest port lain
- **API connection error**: Pastikan backend running di port 8000

#### ML Model Issues
- **Model loading error**: Periksa file `.pkl` di folder `ml_models/`
- **Prediction error**: Pastikan format audio file supported
- **Memory error**: Model membutuhkan minimal 4GB RAM

### Getting Help
- 📝 **Documentation**: Baca README ini secara lengkap
- 🐛 **Bug Reports**: Buat issue di GitHub dengan template yang tersedia
- 💡 **Feature Requests**: Gunakan feature request template
- 💬 **Discussions**: Join GitHub Discussions untuk tanya jawab
- 📧 **Contact**: Reach out melalui email atau social media

### Useful Links
- **Demo**: [Live Demo](https://your-demo-url.com) (if available)
- **API Docs**: [API Documentation](https://your-api-docs.com) (if available)
- **Video Tutorial**: [YouTube Tutorial](https://youtube.com/your-tutorial) (if available)

---

## 🎉 Acknowledgments

- **CatBoost Team** untuk machine learning framework
- **Django & React Communities** untuk framework yang luar biasa
- **Material-UI Team** untuk komponen UI yang indah
- **Librosa Contributors** untuk audio processing library
- **Open Source Community** untuk tools dan libraries yang digunakan

---

**Made with ❤️ for better environmental monitoring**

*Sistem ini dikembangkan untuk membantu monitoring dan analisis polusi suara demi lingkungan yang lebih baik.*

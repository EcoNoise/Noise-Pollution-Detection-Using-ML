#!/usr/bin/env python3
"""
Script untuk mengkonversi model Keras ke TensorFlow.js
"""

import os
import sys
import tensorflow as tf
import tensorflowjs as tfjs
from pathlib import Path

def convert_keras_to_tfjs():
    """
    Konversi model Keras ke format TensorFlow.js
    """
    # Path ke model Keras
    keras_model_path = "backend/ml_models/best_model.keras"
    
    # Path output untuk model TensorFlow.js
    tfjs_output_path = "frontend/public/models/tfjs_model"
    
    try:
        print("Loading Keras model...")
        # Load model Keras
        model = tf.keras.models.load_model(keras_model_path)
        
        print(f"Model loaded successfully!")
        print(f"Model summary:")
        model.summary()
        
        # Buat direktori output jika belum ada
        os.makedirs(tfjs_output_path, exist_ok=True)
        
        print(f"Converting to TensorFlow.js format...")
        # Konversi ke TensorFlow.js
        tfjs.converters.save_keras_model(
            model, 
            tfjs_output_path,
            quantization_bytes=2  # Kompres model untuk ukuran lebih kecil
        )
        
        print(f"✅ Model berhasil dikonversi!")
        print(f"📁 Output location: {tfjs_output_path}")
        
        # Tampilkan informasi file yang dihasilkan
        print("\n📋 Files generated:")
        for file in os.listdir(tfjs_output_path):
            file_path = os.path.join(tfjs_output_path, file)
            size = os.path.getsize(file_path) / 1024  # KB
            print(f"  - {file} ({size:.1f} KB)")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting Keras to TensorFlow.js conversion...")
    convert_keras_to_tfjs()
    print("🎉 Conversion completed!")
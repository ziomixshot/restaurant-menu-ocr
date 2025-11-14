import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import { MAX_COMPRESSED_SIZE } from '../config.js';

async function getImageBuffer(imageSource) {
  if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
    const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } else if (imageSource.startsWith('file://')) {
    const filePath = imageSource.replace('file://', '');
    return await fs.readFile(filePath);
  } else if (imageSource.startsWith('data:')) {
    // It's already a data URI, extract base64
    const base64Data = imageSource.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  } else {
    // Assume it's a local path
    return await fs.readFile(imageSource);
  }
}

export async function compressAndEncodeImage(imageSource) {
  try {
    console.log(`📦 Pobieranie i kompresja obrazu...`);
    
    // Pobierz obraz
    let imageBuffer = await getImageBuffer(imageSource);
    
    // Sprawdź aktualny rozmiar
    let currentSize = imageBuffer.length;
    console.log(`📏 Oryginalny rozmiar: ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Jeśli obraz jest większy niż 5MB, kompresuj
    let quality = 90;
    while (currentSize > MAX_COMPRESSED_SIZE && quality > 10) {
      imageBuffer = await sharp(imageBuffer)
        .jpeg({ quality })
        .toBuffer();
      
      currentSize = imageBuffer.length;
      console.log(`🔄 Kompresja (quality ${quality}): ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
      quality -= 10;
    }
    
    if (currentSize > MAX_COMPRESSED_SIZE) {
      console.warn(`⚠️ Nie udało się skompresować poniżej 5MB. Aktualny rozmiar: ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Konwertuj na Base64
    const base64 = imageBuffer.toString('base64');
    console.log(`✅ Obraz skompresowany i zakodowany (${(currentSize / 1024 / 1024).toFixed(2)} MB)`);
    
    return base64;
  } catch (error) {
    console.error('❌ Błąd podczas kompresji:', error.message);
    throw error;
  }
}


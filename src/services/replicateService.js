import Replicate from 'replicate';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import { MODELS, TARGET_UPSCALE_SIZE } from '../config.js';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function getImageBuffer(imageSource) {
  if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
    const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } else if (imageSource.startsWith('file://')) {
    const filePath = imageSource.replace('file://', '');
    return await fs.readFile(filePath);
  } else {
    // Assume it's a local path
    return await fs.readFile(imageSource);
  }
}

function bufferToDataUri(buffer, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export async function upscaleImage(imageSource) {
  try {
    console.log(`📈 Pobieranie wymiarów obrazu...`);
    
    // Pobierz obraz i sprawdź wymiary
    const imageBuffer = await getImageBuffer(imageSource);
    const metadata = await sharp(imageBuffer).metadata();
    
    const maxDimension = Math.max(metadata.width, metadata.height);
    const scaleFactor = Math.ceil(TARGET_UPSCALE_SIZE / maxDimension);
    
    console.log(`📊 Wymiary: ${metadata.width}x${metadata.height}, Scale factor: ${scaleFactor}`);
    
    if (scaleFactor <= 1) {
      console.log('⚠️ Obraz już ma wystarczającą rozdzielczość, pomijam upscaling');
      return imageSource;
    }
    
    console.log(`🚀 Uruchamiam upscaling...`);
    
    // Konwertuj na data URI dla Replicate
    const mimeType = metadata.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUri = bufferToDataUri(imageBuffer, mimeType);
    
    const output = await replicate.run(MODELS.UPSCALER, {
      input: {
        image: dataUri,
        scale_factor: scaleFactor
      }
    });
    
    console.log(`✅ Upscaling zakończony`);
    return Array.isArray(output) ? output[0] : output;
  } catch (error) {
    console.error('❌ Błąd podczas upscalingu:', error.message);
    throw error;
  }
}

export async function performOcr(imageSource) {
  try {
    console.log(`🔍 Uruchamiam OCR...`);
    
    const output = await replicate.run(MODELS.OCR, {
      input: {
        image: imageSource,
        task_type: "Convert to Markdown",
        resolution_size: "Gundam (Recommended)"
      }
    });
    
    console.log(`✅ OCR zakończony, długość tekstu: ${output.length} znaków`);
    return output;
  } catch (error) {
    console.error('❌ Błąd podczas OCR:', error.message);
    throw error;
  }
}


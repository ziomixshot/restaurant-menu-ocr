import 'dotenv/config';
import { upscaleImage, performOcr } from './services/replicateService.js';
import { compressAndEncodeImage } from './services/imageService.js';
import { extractMenuData } from './services/openRouterService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache helpers
function getFileHash(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex');
}

async function getCached(cacheDir, fileName, type) {
  try {
    const cachePath = path.join(cacheDir, type, fileName);
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function setCache(cacheDir, fileName, type, data) {
  try {
    const typeDir = path.join(cacheDir, type);
    await fs.mkdir(typeDir, { recursive: true });
    const cachePath = path.join(typeDir, fileName);
    await fs.writeFile(cachePath, JSON.stringify(data), 'utf-8');
  } catch (error) {
    console.warn(`⚠️ Nie można zapisać cache: ${error.message}`);
  }
}


// Główna funkcja - pełna asynchroniczność + cache!
async function main() {
  try {
    // Sprawdź zmienne środowiskowe
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('Brak REPLICATE_API_TOKEN w .env');
    }
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('Brak OPENROUTER_API_KEY w .env');
    }
    
    // Pobierz listę zdjęć z folderu input-menu
    const inputDir = path.join(__dirname, '../input-menu');
    const cacheDir = path.join(__dirname, '../tmp');
    const outputDir = path.join(__dirname, '../output');
    
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    
    if (imageFiles.length === 0) {
      throw new Error('Brak zdjęć w folderze input-menu');
    }
    
    console.log(`\n📁 Znaleziono ${imageFiles.length} zdjęć do przetworzenia`);
    console.log(`⚡ Przetwarzanie asynchroniczne - wszystko równolegle!`);
    console.log(`💾 Cache w folderze: tmp/\n`);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(cacheDir, { recursive: true });
    
    const imagePaths = imageFiles.map(f => path.join(inputDir, f));
    
    // KROK 1: UPSCALING WSZYSTKICH OBRAZÓW NARAZ (z cache)
    console.log('🚀 === KROK 1: UPSCALING WSZYSTKICH OBRAZÓW RÓWNOLEGLE ===');
    const upscaledImages = await Promise.all(
      imagePaths.map(async (imagePath, i) => {
        const cacheKey = `${imageFiles[i]}.json`;
        const cached = await getCached(cacheDir, cacheKey, 'upscaled');
        
        if (cached) {
          console.log(`  💾 [${i + 1}/${imageFiles.length}] Z cache (upscaling): ${imageFiles[i]}`);
          return cached.url;
        }
        
        try {
          console.log(`  📈 [${i + 1}/${imageFiles.length}] Upscaling: ${imageFiles[i]}`);
          const result = await upscaleImage(imagePath);
          await setCache(cacheDir, cacheKey, 'upscaled', { url: result });
          console.log(`  ✅ [${i + 1}/${imageFiles.length}] Upscaling zakończony: ${imageFiles[i]}`);
          return result;
        } catch (error) {
          console.error(`  ❌ [${i + 1}/${imageFiles.length}] Błąd upscaling: ${imageFiles[i]} - ${error.message}`);
          throw error;
        }
      })
    );
    console.log('✅ Wszystkie obrazy przeskalowane!\n');
    
    // KROK 2: OCR WSZYSTKICH OBRAZÓW NARAZ (z cache)
    console.log('🔍 === KROK 2: OCR WSZYSTKICH OBRAZÓW RÓWNOLEGLE ===');
    const ocrResults = await Promise.all(
      upscaledImages.map(async (upscaledImage, i) => {
        const cacheKey = `${imageFiles[i]}.json`;
        const cached = await getCached(cacheDir, cacheKey, 'ocr');
        
        if (cached) {
          console.log(`  💾 [${i + 1}/${imageFiles.length}] Z cache (OCR): ${imageFiles[i]} (${cached.text.length} znaków)`);
          return cached.text;
        }
        
        try {
          console.log(`  🔍 [${i + 1}/${imageFiles.length}] OCR: ${imageFiles[i]}`);
          const result = await performOcr(upscaledImage);
          await setCache(cacheDir, cacheKey, 'ocr', { text: result });
          console.log(`  ✅ [${i + 1}/${imageFiles.length}] OCR zakończony: ${imageFiles[i]} (${result.length} znaków)`);
          return result;
        } catch (error) {
          console.error(`  ❌ [${i + 1}/${imageFiles.length}] Błąd OCR: ${imageFiles[i]} - ${error.message}`);
          throw error;
        }
      })
    );
    console.log('✅ Wszystkie OCR zakończone!\n');
    
    // KROK 3: KOMPRESJA WSZYSTKICH OBRAZÓW NARAZ (z cache)
    console.log('📦 === KROK 3: KOMPRESJA WSZYSTKICH OBRAZÓW RÓWNOLEGLE ===');
    const compressedImages = await Promise.all(
      upscaledImages.map(async (upscaledImage, i) => {
        const cacheKey = `${imageFiles[i]}.json`;
        const cached = await getCached(cacheDir, cacheKey, 'compressed');
        
        if (cached) {
          console.log(`  💾 [${i + 1}/${imageFiles.length}] Z cache (kompresja): ${imageFiles[i]}`);
          return cached.base64;
        }
        
        try {
          console.log(`  📦 [${i + 1}/${imageFiles.length}] Kompresja: ${imageFiles[i]}`);
          const result = await compressAndEncodeImage(upscaledImage);
          await setCache(cacheDir, cacheKey, 'compressed', { base64: result });
          console.log(`  ✅ [${i + 1}/${imageFiles.length}] Kompresja zakończona: ${imageFiles[i]}`);
          return result;
        } catch (error) {
          console.error(`  ❌ [${i + 1}/${imageFiles.length}] Błąd kompresji: ${imageFiles[i]} - ${error.message}`);
          throw error;
        }
      })
    );
    console.log('✅ Wszystkie obrazy skompresowane!\n');
    
    // KROK 4: EKSTRAKCJA DANYCH - WSZYSTKO NARAZ DO GEMINI
    console.log('🤖 === KROK 4: EKSTRAKCJA DANYCH (WSZYSTKIE MENU DO GEMINI NARAZ) ===');
    const allFilesCacheKey = `all_${imageFiles.join('_')}.json`;
    const cachedMenu = await getCached(cacheDir, allFilesCacheKey, 'menu');
    
    let menuData;
    if (cachedMenu) {
      console.log(`💾 Pełne menu z cache!`);
      menuData = cachedMenu;
    } else {
      console.log(`🚀 Wysyłam ${compressedImages.length} zdjęć + ${ocrResults.length} OCR do Gemini...`);
      menuData = await extractMenuData(compressedImages, ocrResults, imageFiles);
      await setCache(cacheDir, allFilesCacheKey, 'menu', menuData);
    }
    console.log('✅ Menu wyekstrahowane!\n');
    
    // KROK 5: ZAPIS WYNIKU
    console.log('💾 === KROK 5: ZAPIS WYNIKU ===');
    const outputPath = path.join(outputDir, 'menu.json');
    await fs.writeFile(outputPath, JSON.stringify(menuData, null, 2), 'utf-8');
    console.log(`  💾 Zapisano: menu.json`);
    
    console.log('\n🎉 === ZAKOŃCZONO PRZETWARZANIE ===\n');
    console.log(`📊 Przetworzono: ${imageFiles.length} zdjęć`);
    console.log(`📋 Kategorii w menu: ${menuData.menu?.length || 0}`);
    console.log(`📁 Wynik: output/menu.json\n`);
  } catch (error) {
    console.error('❌ Błąd krytyczny:', error.message);
    process.exit(1);
  }
}

main();


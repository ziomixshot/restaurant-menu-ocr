import axios from 'axios';
import { MODELS, MENU_SCHEMA } from '../config.js';

export async function extractMenuData(base64Images, ocrTexts, fileNames) {
  try {
    console.log(`🤖 Wysyłam ${base64Images.length} zdjęć do Gemini przez OpenRouter...`);
    
    // Zbuduj tekst z wszystkich OCR
    const allOcrTexts = ocrTexts.map((ocr, i) => `
=== ZDJĘCIE ${i + 1}: ${fileNames[i]} ===
${ocr}
`).join('\n\n');
    
    const promptText = `Twoim jednym zadaniem jest odczytać i zwrócić mi wszystkie pozycje w menu które otrzymujesz. Reszte informacji jak jakieś informacje powiadomienia reklamy ignorujesz. Twoim zadaniem jest zwrócić tylko całe menu w żądanym formacie.

Otrzymujesz ${base64Images.length} zdjęć MENU + oraz już wyodrębniony tekst przez inny OCR dla pomocy.

Eliminuj literówki np.: "Argentyne" -> "Argentyna"

Jeśli dana pozycja ma dwa warianty albo więcej to zduplikuj tą pozycję. Np dane wino ma cenę x za 150ml i cenę y za 750 ml to stwórz dwie pozycje tej samej pozycji gdzie jedna będzie mieć w opisie 150 ml a cenę podaną x a drugą pozycję która ma w opisie 750 ml i cenę y.

Jeśli są gramatury/pojemności to podawaj je w opisach właśnie.

Tekst z OCR ze wszystkich zdjęć:
---
${allOcrTexts}
---

Zwróć odpowiedź WYŁĄCZNIE w formacie JSON, bez żadnych dodatkowych wyjaśnień, markdownu czy tekstu przed lub po JSONie. Struktura JSON musi być zgodna z następującym schematem:

${JSON.stringify(MENU_SCHEMA, null, 2)}`;

    // Zbuduj content z tekstem + wszystkie obrazy
    const content = [
      {
        type: 'text',
        text: promptText
      },
      ...base64Images.map(base64 => ({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64}`
        }
      }))
    ];

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODELS.GEMINI,
        stream: false,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = response.data.choices[0].message.content;
    console.log(`✅ Otrzymano odpowiedź od Gemini`);
    
    // Parsuj JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Nie znaleziono JSON w odpowiedzi');
    }
    
    const menuData = JSON.parse(jsonMatch[0]);
    console.log(`📋 Wyekstrahowano ${menuData.menu?.length || 0} kategorii`);
    
    return menuData;
  } catch (error) {
    console.error('❌ Błąd podczas ekstrakcji danych:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}


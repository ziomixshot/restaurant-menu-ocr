export const MODELS = {
  UPSCALER: 'philz1337x/crystal-upscaler',
  OCR: 'lucataco/deepseek-ocr:cb3b474fbfc56b1664c8c7841550bccecbe7b74c30e45ce938ffca1180b4dff5',
  GEMINI: 'google/gemini-2.5-pro'
};

export const TARGET_UPSCALE_SIZE = 4000;
export const MAX_COMPRESSED_SIZE = 5 * 1024 * 1024; // 5MB

export const MENU_SCHEMA = {
  "type": "object",
  "properties": {
    "menu": {
      "type": "array",
      "description": "Lista kategorii dań w menu.",
      "items": {
        "type": "object",
        "properties": {
          "kategoria": {
            "type": "string",
            "description": "Nazwa kategorii, np. 'Przystawki'."
          },
          "dania": {
            "type": "array",
            "description": "Lista dań w danej kategorii.",
            "items": {
              "type": "object",
              "properties": {
                "nazwa": {
                  "type": "string"
                },
                "opis": {
                  "type": "string"
                },
                "cena": {
                  "type": "number"
                },
                "waluta": {
                  "type": "string"
                }
              },
              "required": [
                "nazwa",
                "opis",
                "cena",
                "waluta"
              ]
            }
          }
        },
        "required": [
          "kategoria",
          "dania"
        ]
      }
    }
  },
  "required": [
    "menu"
  ]
};


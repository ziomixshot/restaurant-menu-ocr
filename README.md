# Restaurant Menu OCR

An automated Node.js pipeline that extracts structured menu data from restaurant menu photographs using AI-powered image upscaling, OCR, and multimodal LLM processing.

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Output Format](#output-format)
- [Caching](#caching)
- [Project Structure](#project-structure)
- [API Services](#api-services)
- [License](#license)

## Features

- **Intelligent Image Upscaling** – Automatically upscales menu images to 4000px (longest edge) using Crystal Upscaler for improved OCR accuracy
- **Advanced OCR** – Extracts text from upscaled images using DeepSeek OCR with Gundam resolution mode and Markdown output
- **AI-Powered Structuring** – Uses Gemini 2.5 Pro (via OpenRouter) to intelligently parse and structure menu items, handling variants, corrections, and edge cases
- **Parallel Processing** – All images are processed asynchronously in parallel batches (upscaling, OCR, compression) for maximum throughput
- **Batch Menu Extraction** – Multiple menu images are sent to Gemini together to produce a single unified menu JSON
- **Smart Caching** – Results cached at every stage (`tmp/`) to avoid expensive reprocessing on subsequent runs
- **Handles Complex Menus** – Automatically corrects OCR typos, duplicates items with multiple sizes/prices, and includes portion sizes in descriptions

## How It Works

```
┌─────────────────┐
│  Input Images   │  (input-menu/*.jpg)
│   (multiple)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UPSCALING     │  ← Parallel (all images at once)
│  (4000px edge)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      OCR        │  ← Parallel (all images at once)
│  (DeepSeek MD)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  COMPRESSION    │  ← Parallel (all images at once)
│   (<5MB each)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GEMINI 2.5 PRO │  ← Single call with ALL images + OCR
│  (Structured)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  output/menu.json
└─────────────────┘
```

Each stage caches its results. On the second run with the same inputs, everything is retrieved from cache instantly.

## Installation

**Prerequisites:**
- Node.js 18+ (ESM modules)
- npm or yarn

**Steps:**

```bash
# Clone the repository
git clone https://github.com/ziomixshot/restaurant-menu-ocr.git
cd restaurant-menu-ocr

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root with your API keys:

```env
REPLICATE_API_TOKEN=r8_your_replicate_token_here
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
```

**Where to get API keys:**
- **Replicate**: Sign up at [replicate.com](https://replicate.com) and create an API token
- **OpenRouter**: Sign up at [openrouter.ai](https://openrouter.ai) and generate an API key

## Usage

1. **Add menu images** to the `input-menu/` directory (supports `.jpg`, `.jpeg`, `.png`)

2. **Run the pipeline:**

```bash
npm start
```

3. **Results** will be saved to `output/menu.json`

**Example:**

```bash
# Place your menu photos
input-menu/
  ├── page1.jpg
  ├── page2.jpg
  └── page3.jpg

# Run
npm start

# Output
✅ Menu wyekstrahowane!
💾 Zapisano: menu.json
📋 Kategorii w menu: 8
```

## Output Format

The pipeline produces a structured JSON file with the following schema:

```json
{
  "menu": [
    {
      "kategoria": "Wina Białe",
      "dania": [
        {
          "nazwa": "Torre del Falasco Soave",
          "opis": "Wytrawne (Włochy), Szczepy: Garganega, 750 ml",
          "cena": 17.00,
          "waluta": "PLN"
        },
        {
          "nazwa": "Juan Gil Moscatel",
          "opis": "Wytrawne (Hiszpania), Szczepy: Muscat, 750 ml",
          "cena": 25.00,
          "waluta": "PLN"
        }
      ]
    },
    {
      "kategoria": "Wina Czerwone",
      "dania": [
        {
          "nazwa": "7 Treasures",
          "opis": "Wytrawne (Argentyna, Mendoza), Szczepy: Malbec, 750 ml",
          "cena": 93.00,
          "waluta": "PLN"
        }
      ]
    }
  ]
}
```

**Field descriptions:**
- `kategoria` – Menu category (e.g., "Appetizers", "Main Courses", "Desserts")
- `nazwa` – Item name
- `opis` – Item description (may include ingredients, origin, portion size)
- `cena` – Price as a number
- `waluta` – Currency code or symbol (e.g., "PLN", "EUR", "USD", "zł")

**Special handling:**
- Items with multiple sizes or prices are duplicated with distinct entries (e.g., wine by 150ml vs 750ml)
- OCR typos are automatically corrected (e.g., "Argentyne" → "Argentyna")
- Advertisements and non-menu content are filtered out

## Caching

All intermediate results are cached in the `tmp/` directory to speed up subsequent runs:

```
tmp/
├── upscaled/          # Upscaled image URLs from Replicate
├── ocr/               # OCR text results (Markdown)
├── compressed/        # Compressed base64-encoded images
└── menu/              # Final extracted menu JSON
```

**To clear the cache:**

```bash
# Unix/macOS/Linux
rm -rf tmp/

# Windows PowerShell
Remove-Item -Recurse -Force tmp
```

Cache is keyed by input filenames. If you change the input images, only new/changed images will be reprocessed.

## Project Structure

```
restaurant-menu-ocr/
├── src/
│   ├── config.js                  # Model names, schemas, constants
│   ├── index.js                   # Main orchestrator with caching
│   └── services/
│       ├── replicateService.js    # Upscaling and OCR via Replicate
│       ├── imageService.js        # Image compression to <5MB
│       └── openRouterService.js   # Gemini extraction via OpenRouter
├── input-menu/                    # (gitignored) Place your menu images here
├── output/                        # (gitignored) Generated menu.json
├── tmp/                           # (gitignored) Cache directory
├── .env                           # (gitignored) API keys
├── package.json
└── README.md
```

## API Services

This project relies on the following external APIs:

| Service | Purpose | Model/Version |
|---------|---------|---------------|
| [Replicate](https://replicate.com) | Image upscaling | `philz1337x/crystal-upscaler` |
| [Replicate](https://replicate.com) | OCR text extraction | `lucataco/deepseek-ocr` (Gundam mode) |
| [OpenRouter](https://openrouter.ai) | Menu structuring | `google/gemini-2.5-pro` |

**Cost considerations:**
- Replicate charges per prediction (upscaling ~$0.01–0.05, OCR ~$0.01–0.10 per image)
- OpenRouter charges per token (Gemini 2.5 Pro pricing varies; check [openrouter.ai/models](https://openrouter.ai/models))
- Caching dramatically reduces costs on repeated runs

## License

No license file is present in this repository. Please contact the repository owner to clarify usage terms before using this code in production or distributing it.


# Translation API Documentation

## Overview
This is a free translation API that requires **no API key**. Anyone can use it to translate text between 100+ languages.

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### 1. Health Check
Check if the API is running.

**GET** `/api/health`

**Response:**
```json
{
  "status": "ok",
  "message": "Translation API is running",
  "version": "1.0.0"
}
```

---

### 2. Translate (GET)
Translate text using query parameters.

**GET** `/api/translate`

**Query Parameters:**
| Parameter | Type   | Required | Default | Description                |
|-----------|--------|----------|---------|----------------------------|
| `q`       | string | Yes      | -       | Text to translate          |
| `sl`      | string | No       | `auto`  | Source language code       |
| `tl`      | string | No       | `en`    | Target language code       |

**Example Request:**
```bash
curl "http://localhost:3000/api/translate?q=hello&sl=en&tl=es"
```

**Response:**
```json
{
  "success": true,
  "translation": {
    "text": "hello",
    "translatedText": "Hola",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }
}
```

---

### 3. Translate (POST)
Translate longer text using JSON body.

**POST** `/api/translate`

**Headers:**
```
Content-Type: application/json
```

**Body Parameters:**
| Parameter        | Type   | Required | Default | Description                |
|------------------|--------|----------|---------|----------------------------|
| `text`           | string | Yes      | -       | Text to translate          |
| `sourceLanguage` | string | No       | `auto`  | Source language code       |
| `targetLanguage` | string | No       | `en`    | Target language code       |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/translate" \
  -H "Content-Type: application/json" \
  -d '{"text":"Good morning","sourceLanguage":"en","targetLanguage":"fr"}'
```

**Response:**
```json
{
  "success": true,
  "translation": {
    "text": "Good morning",
    "translatedText": "Bonjour",
    "sourceLanguage": "en",
    "targetLanguage": "fr"
  }
}
```

---

## Supported Languages

The API supports 100+ languages including:

| Code  | Language          | Code  | Language           |
|-------|-------------------|-------|--------------------|
| `en`  | English           | `es`  | Spanish            |
| `fr`  | French            | `de`  | German             |
| `it`  | Italian           | `pt`  | Portuguese         |
| `ru`  | Russian           | `ja`  | Japanese           |
| `ko`  | Korean            | `zh-CN` | Chinese (Simplified) |
| `zh-TW` | Chinese (Traditional) | `ar`  | Arabic             |
| `hi`  | Hindi             | `bn`  | Bengali            |
| `tr`  | Turkish           | `vi`  | Vietnamese         |
| `th`  | Thai              | `id`  | Indonesian         |
| `nl`  | Dutch             | `pl`  | Polish             |
| `uk`  | Ukrainian         | `el`  | Greek              |
| `he`  | Hebrew            | `sv`  | Swedish            |
| `no`  | Norwegian         | `da`  | Danish             |
| `fi`  | Finnish           | `cs`  | Czech              |
| `ro`  | Romanian          | `hu`  | Hungarian          |
| `auto`| Auto-detect       |       |                    |

*Use `auto` as the source language to automatically detect the language.*

---

## Error Responses

### Missing Required Parameter
```json
{
  "error": "Missing required parameter: q (text to translate)"
}
```

### Translation Service Unavailable
```json
{
  "success": false,
  "error": "Unable to translate. Please try again."
}
```

---

## Usage Examples

### JavaScript (Fetch)
```javascript
// GET request
const response = await fetch('http://localhost:3000/api/translate?q=hello&sl=en&tl=es');
const data = await response.json();
console.log(data.translation.translatedText); // "Hola"

// POST request
const response = await fetch('http://localhost:3000/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Good morning',
    sourceLanguage: 'en',
    targetLanguage: 'fr'
  })
});
const data = await response.json();
console.log(data.translation.translatedText); // "Bonjour"
```

### Python (Requests)
```python
import requests

# GET request
response = requests.get('http://localhost:3000/api/translate', params={
    'q': 'hello',
    'sl': 'en',
    'tl': 'es'
})
data = response.json()
print(data['translation']['translatedText'])  # "Hola"

# POST request
response = requests.post('http://localhost:3000/api/translate', json={
    'text': 'Good morning',
    'sourceLanguage': 'en',
    'targetLanguage': 'fr'
})
data = response.json()
print(data['translation']['translatedText'])  # "Bonjour"
```

### cURL
```bash
# GET request
curl "http://localhost:3000/api/translate?q=hello&sl=en&tl=es"

# POST request
curl -X POST "http://localhost:3000/api/translate" \
  -H "Content-Type: application/json" \
  -d '{"text":"Good morning","sourceLanguage":"en","targetLanguage":"fr"}'
```

---

## Running the Server

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 3000 by default. You can change the port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

---

## Notes

- **No API key required** - This API is free to use
- Rate limiting may apply depending on Google's translation service
- Maximum text length: 5000 characters per request
- The API uses Google Translate's public endpoint

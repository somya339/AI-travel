# ML Service

FastAPI microservice for generating vector embeddings using sentence-transformers.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
uvicorn app:app --reload --port 8000
```

## API Endpoints

### GET /health
Returns service health status.

### POST /embed
Generate embeddings for a list of texts.

**Request:**
```json
{
  "texts": ["Your text here", "Another text"]
}
```

**Response:**
```json
{
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]]
}
```

## Usage from Node.js

```javascript
const response = await fetch('http://localhost:8000/embed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    texts: ['Your text here']
  })
});
const data = await response.json();
```

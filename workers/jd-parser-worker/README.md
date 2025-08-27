# JD Parser Worker

AI-powered job description parsing service that extracts skills, keywords, and structured information from job postings.

## Overview

The JD Parser Worker is a FastAPI-based microservice that uses advanced NLP techniques to analyze job descriptions and extract:

- **Technical Skills**: Programming languages, frameworks, tools, databases
- **Soft Skills**: Communication, leadership, problem-solving abilities
- **Keywords**: Important terms and industry-specific vocabulary
- **Experience Requirements**: Years of experience, seniority levels
- **Education Requirements**: Degree levels, certifications
- **Salary Information**: Compensation ranges and benefits
- **Job Details**: Location, job type, responsibilities, qualifications

## Features

- **AI-Powered Parsing**: Uses spaCy, NLTK, and custom ML models
- **Multiple Extraction Methods**: Pattern matching, keyword matching, context analysis
- **Confidence Scoring**: Provides confidence scores for extracted information
- **Async Processing**: Supports both synchronous and asynchronous processing
- **Skill Taxonomy**: Maintains and updates skill database
- **Queue Integration**: Works with Redis/Celery or NATS for distributed processing
- **Database Storage**: Stores parsed results in PostgreSQL with pgvector support

## Installation

### Prerequisites

- Python 3.8+
- PostgreSQL with pgvector extension
- Redis (optional, for task queuing)
- NATS (optional, alternative to Redis)

### Setup

1. **Clone and navigate to the worker directory**
   ```bash
   cd workers/jd-parser-worker
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download spaCy model**
   ```bash
   python -m spacy download en_core_web_sm
   ```

5. **Configure environment**
   ```bash
   cp config.example.yaml config.yaml
   # Edit config.yaml with your settings
   ```

## Usage

### Starting the Service

```bash
# Development mode with auto-reload
python -m uvicorn src.main:app --reload

# Production mode
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000
```

The service will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs

### API Endpoints

#### Parse Job Description
```bash
# Synchronous parsing
curl -X POST "http://localhost:8000/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job-123",
    "title": "Senior Python Developer",
    "description": "We are looking for a Senior Python Developer...",
    "requirements": "5+ years experience with Python, Django...",
    "company": "Tech Corp"
  }'
```

#### Asynchronous Parsing
```bash
# Queue job for async processing
curl -X POST "http://localhost:8000/parse/async" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job-123",
    "title": "Senior Python Developer",
    "description": "We are looking for a Senior Python Developer...",
    "requirements": "5+ years experience with Python, Django...",
    "company": "Tech Corp",
    "callback_url": "https://your-app.com/webhook"
  }'

# Check status
curl "http://localhost:8000/task/{task_id}"
```

#### Extract Skills
```bash
curl -X POST "http://localhost:8000/skills/extract" \
  -H "Content-Type: application/json" \
  -d '"We need someone with Python, React, and AWS experience"'
```

#### Extract Keywords
```bash
curl -X POST "http://localhost:8000/keywords/extract" \
  -H "Content-Type: application/json" \
  -d '"Senior developer role requiring machine learning expertise"'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/resume_builder` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `NATS_URL` | NATS connection URL | `nats://localhost:4222` |
| `PORT` | Service port | `8000` |
| `ENVIRONMENT` | Environment (development/production) | `development` |
| `OPENAI_API_KEY` | OpenAI API key for enhanced parsing | - |

### Advanced Configuration

Edit `config.yaml` for detailed configuration:

```yaml
database:
  url: postgresql://...
  ssl: false

nlp:
  enable_advanced_features: true
  spacy_model: en_core_web_sm
  openai_enhancement: true

queue:
  max_concurrent_tasks: 4
  task_timeout_seconds: 300
```

## Architecture

### Core Components

1. **JobDescriptionParser**: Main orchestrator that coordinates parsing
2. **NLPProcessor**: Text preprocessing and basic NLP operations
3. **SkillExtractor**: Extracts technical and soft skills
4. **KeywordExtractor**: Identifies important keywords and phrases
5. **TaskQueue**: Handles asynchronous job processing
6. **DatabaseManager**: Manages data persistence

### Processing Pipeline

1. **Text Preprocessing**: Clean and normalize text
2. **Entity Extraction**: Identify named entities and structured data
3. **Skill Extraction**: Find technical and soft skills
4. **Keyword Analysis**: Extract important terms and phrases
5. **Context Analysis**: Understand requirements and qualifications
6. **Confidence Scoring**: Rate extraction quality
7. **Data Storage**: Save results to database

## API Response Format

```json
{
  "job_id": "job-123",
  "skills": ["Python", "Django", "React", "AWS"],
  "keywords": ["web development", "backend", "frontend", "cloud"],
  "experience_level": "Senior Level",
  "education_level": "Bachelor's Degree",
  "salary_range": {
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  },
  "location": "Remote",
  "job_type": "Full-time",
  "benefits": ["Health Insurance", "401k", "Remote Work"],
  "responsibilities": ["Develop web applications", "Collaborate with team"],
  "qualifications": ["5+ years experience", "Computer Science degree"],
  "technologies": ["Python", "JavaScript", "PostgreSQL"],
  "soft_skills": ["Communication", "Problem Solving"],
  "industry_keywords": ["SaaS", "Fintech", "Agile"],
  "confidence_scores": {
    "skills": 0.85,
    "keywords": 0.78,
    "experience": 0.92,
    "education": 0.88,
    "overall": 0.86
  }
}
```

## Integration with Main Application

The JD Parser Worker integrates with the main application through:

- **REST API**: Direct HTTP calls for synchronous parsing
- **Webhooks**: Asynchronous processing with callback notifications
- **Database**: Shared PostgreSQL database for storing results
- **Queue**: Redis/NATS for distributed task processing

### Example Integration

```python
import httpx

async def parse_job_description(job_id: str, title: str, description: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/parse",
            json={
                "job_id": job_id,
                "title": title,
                "description": description,
            }
        )
        return response.json()
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install -e .[test]

# Run tests
pytest tests/

# Run with coverage
pytest --cov=src --cov-report=html tests/
```

### Code Quality

```bash
# Format code
black src/ tests/

# Sort imports
isort src/ tests/

# Lint code
flake8 src/ tests/

# Type checking
mypy src/
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -m spacy download en_core_web_sm

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes

See `k8s/` directory for Kubernetes deployment manifests.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is part of the AI-Powered Resume Builder application.

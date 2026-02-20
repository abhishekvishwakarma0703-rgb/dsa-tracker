# DSA Problem Tracker Backend

Production-grade FastAPI backend for the DSA Problem Tracker application with LLM integration support.

## Features

- **RESTful API** with comprehensive problem management
- **Async-first** architecture for high performance
- **Code Execution** with safe sandboxed environment
- **LLM Integration** ready (OpenAI, Anthropic, Cohere support)
- **Database** with SQLAlchemy ORM (SQLite/PostgreSQL)
- **Authentication** ready (JWT-based)
- **Logging** with structured logs
- **Docker** support for easy deployment
- **Error Handling** with comprehensive error responses

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── problems.py      # Problem CRUD endpoints
│   │       │   ├── solutions.py     # Solution submission & testing
│   │       │   ├── insights.py      # User insights management
│   │       │   └── health.py        # Health check endpoints
│   │       └── router.py            # API router configuration
│   ├── core/
│   │   ├── config.py               # Configuration settings
│   │   └── logging_config.py       # Logging configuration
│   ├── db/
│   │   ├── database.py             # Database setup
│   │   └── models.py               # SQLAlchemy models
│   ├── middleware/
│   │   └── error_handler.py        # Error handling middleware
│   ├── schemas/
│   │   └── problem.py              # Pydantic schemas
│   └── services/
│       └── code_executor.py        # Code execution service
├── main.py                         # Application entry point
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Docker configuration
├── .env.example                    # Environment variables template
└── README.md                       # This file
```

## Installation

### 1. Prerequisites

- Python 3.11+
- Node.js (for JavaScript code execution)
- PostgreSQL (optional, uses SQLite by default)
- Docker & Docker Compose (optional)

### 2. Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Update .env with your settings if needed
```

### 3. Run Development Server

```bash
# Using uvicorn
uvicorn main:app --reload

# Or using Python directly
python main.py
```

The API will be available at `http://localhost:8000`

- API Docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# From project root
docker-compose up --build

# The API will be at http://localhost:8000
# Frontend at http://localhost:5173
# PostgreSQL at localhost:5432
```

### Using Docker Standalone

```bash
# Build image
docker build -t dsa-api:latest ./backend

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL="sqlite+aiosqlite:///./dsa_tracker.db" \
  -e DEBUG=False \
  dsa-api:latest
```

## API Endpoints

### Problems
- `GET /api/v1/problems` - Get all problems
- `GET /api/v1/problems/{id}` - Get specific problem
- `POST /api/v1/problems` - Create problem
- `PUT /api/v1/problems/{id}` - Update problem
- `DELETE /api/v1/problems/{id}` - Delete problem

### Solutions
- `POST /api/v1/solutions/{problem_id}/submit` - Submit solution
- `POST /api/v1/solutions/{problem_id}/test` - Test solution
- `GET /api/v1/solutions/user/{user_id}` - Get user solutions
- `GET /api/v1/solutions/{id}` - Get specific solution

### Insights
- `POST /api/v1/insights/{problem_id}` - Create insight
- `GET /api/v1/insights/{problem_id}` - Get problem insights
- `GET /api/v1/insights/user/{user_id}` - Get user insights
- `DELETE /api/v1/insights/{id}` - Delete insight

### Health
- `GET /api/v1/health` - Health check

## Environment Configuration

Edit `.env` file to configure:

```
# API Settings
HOST=0.0.0.0
PORT=8000
DEBUG=False
LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite+aiosqlite:///./dsa_tracker.db

# LLM Integration (Future)
LLM_ENABLED=False
LLM_PROVIDER=openai
LLM_API_KEY=your_key_here

# Code Execution
CODE_EXECUTION_TIMEOUT=5
SANDBOX_ENABLED=True
```

## LLM Integration (Future Features)

The backend is pre-configured for LLM integration:

1. **Code Analysis** - AI-powered code review and suggestions
2. **Hint Generation** - Intelligent problem hints
3. **Solution Explanation** - Automatic explanation generation

To enable:

```env
LLM_ENABLED=True
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_key
```

## Code Execution

The backend safely executes user code in a sandboxed environment:

- **Supported Languages**: JavaScript, Python
- **Timeout**: 5 seconds (configurable)
- **Max Code Length**: 10KB (configurable)

### Example Usage

```python
result = await execute_code(
    code="function solution(arr) { return arr[0]; }",
    input_data=[1, 2, 3],
    language="javascript",
    timeout=5
)
```

## Database Models

- **User** - User accounts and profiles
- **Problem** - DSA problems with metadata
- **UserProblem** - User progress tracking
- **Solution** - User code solutions
- **Insight** - User notes and insights
- **Tag** - Problem tags and categorization

## Performance Considerations

- Async/await for non-blocking I/O
- Connection pooling for database
- GZip compression for responses
- Configurable caching (future)
- Structured logging for monitoring

## Security

- CORS middleware for cross-origin requests
- Input validation with Pydantic
- Safe code execution in sandbox
- JWT authentication ready
- Environment-based configuration

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app

# Watch mode
pytest-watch
```

## Development

### Code Style

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head
```

## Troubleshooting

### Database Connection Error
- Verify DATABASE_URL in .env
- Ensure PostgreSQL is running (if using)
- Check file permissions for SQLite

### Code Execution Issues
- Ensure Python/Node.js is installed
- Check SANDBOX_ENABLED setting
- Verify timeout settings

### CORS Issues
- Update CORS_ORIGINS in .env
- Verify frontend URL

## Future Enhancements

- [ ] User authentication system
- [ ] Advanced LLM integration
- [ ] Caching layer (Redis)
- [ ] GraphQL API
- [ ] WebSocket support
- [ ] Rate limiting
- [ ] Analytics and metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues and questions, please visit:
- GitHub Issues: [Link to repo]
- Email: support@dsatracker.dev
# backend-v1

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1 \
    libpq-dev \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-lock.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements-lock.txt

COPY backend .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
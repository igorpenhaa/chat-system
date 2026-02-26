FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3-dev git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
#COPY ../chat.proto /app/chat.proto

RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. ./chat.proto

EXPOSE 50052

CMD ["python", "server_b.py"]


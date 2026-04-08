# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG CMD=api
RUN go build -o /app/server ./cmd/${CMD}/...

# Runtime stage
FROM python:3.12-slim
RUN pip install --no-cache-dir ansible-runner==2.4.0 ansible==9.0.0
WORKDIR /app
COPY --from=builder /app/server /app/server
EXPOSE 8080
CMD ["/app/server"]

# Selendra Explorer

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Selendra Explorer is an open-source block explorer for the Selendra Network, providing a comprehensive interface for blockchain data exploration and analysis. It features a robust backend powered by SurrealDB and offers both archive services and REST API endpoints.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
  - [Database Setup](#database-setup)
  - [Archive Service](#archive-service)
  - [Explorer API](#explorer-api)
- [API Documentation](#api-documentation)
- [Development Guide](#development-guide)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- **Rust** (latest stable version)
- **Docker** and Docker Compose
- **Git**

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/selendra/explorer.git
   cd explorer
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```

3. Start SurrealDB and services:
   ```bash
   ./scripts/init.sh              # Initialize database
   cargo run -p archive-service   # Start archive service
   cargo run -p explorer-api      # Start API server
   ```

## Architecture

### Database Setup

The explorer uses SurrealDB as its primary database. Initialize it using Docker:

```bash
./scripts/init.sh
```

This script sets up the necessary database containers and configurations.

### Archive Service

The Archive Service indexes and stores blockchain data in SurrealDB.

**Development Mode:**
```bash
cargo run -p archive-service
```

**Production Mode:**
```bash
cargo build --release
./target/release/archive-service
```

### Explorer API

REST API service built with Actix-web for accessing blockchain data.

**Development Mode:**
```bash
cargo run -p explorer-api
```

**Production Mode:**
```bash
cargo build --release
./target/release/explorer-api
```

## API Documentation

Access the API documentation through:

- **Swagger UI:** [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
  - Interactive API testing and documentation interface
  
- **OpenAPI Spec:** [http://localhost:8080/api-docs/openapi.json](http://localhost:8080/api-docs/openapi.json)
  - OpenAPI specification for integrations

## Development Guide

### Project Structure

```
selendra-explorer/
├── archive-service/  # Blockchain data indexing service
├── api/             # REST API implementation
├── scripts/         # Utility and deployment scripts
├── docker/          # Docker configurations
├── db/              # SurrealDB implementation
├── rust-client/     # Substrate & EVM clients
├── config/          # Project configuration
└── data/            # Persistent data storage
```

### Building and Testing

**Build the Project:**
```bash
cargo build         # Debug build
cargo build --release  # Production build
```

**Run Tests:**
```bash
cargo test         # Run all tests
cargo test -p api  # Test specific package
```

## Contributing

We welcome contributions to Selendra Explorer! Please see our [Contributing Guide](CONTRIBUTING.md) for:

- Code submission guidelines
- Pull request process
- Development practices
- Bug reporting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Resources:**
- [Official Website](https://selendra.org)
- [GitHub Repository](https://github.com/selendra/explorer)
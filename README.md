# Selendra Explorer
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Block explorer for the Selendra Network featuring a SurrealDB backend, archive services, and REST API endpoints.

## Quick Start

### Prerequisites
- Rust (latest stable)
- Docker and Docker Compose
- Git

### Installation
```bash
# Clone and setup
git clone https://github.com/selendra/explorer.git
cd explorer
cp .env.example .env

# Initialize and start services
./scripts/init.sh            # Setup database
cargo run -p archive-service -- evm --block # Start archive service
cargo run -p explorer-api    # Start API server
```

## Core Components

### Archive Service
Indexes blockchain data into SurrealDB.

```bash
# Development
cargo run -p archive-service -- <command>

# EVM Services
cargo run -p archive-service -- evm --account  # Archive EVM accounts
cargo run -p archive-service -- evm --block    # Archive EVM blocks

# Substrate Services
cargo run -p archive-service -- substrate --account  # Archive Substrate accounts
cargo run -p archive-service -- substrate --block    # Archive Substrate blocks

# Production
cargo build --release
./target/release/archive-service <command>
```

### Explorer API
REST API built with Actix-web.

```bash
# Development
cargo run -p explorer-api

# Production
cargo build --release
./target/release/explorer-api
```

### API Documentation
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI Spec: http://localhost:8080/api-docs/openapi.json

## Development

### Project Structure
```
selendra-explorer/
├── archive-service/ # Indexing service
├── api/            # REST API
├── scripts/        # Utilities
├── docker/         # Docker configs
├── db/             # Database
├── rust-client/    # Blockchain clients
├── config/         # Configuration
└── data/           # Storage
```

### Build & Test
```bash
# Build
cargo build            # Debug
cargo build --release  # Production

# Test
cargo test            # All tests
cargo test -p api     # Package specific
```

## Contributing
See [Contributing Guide](CONTRIBUTING.md) for guidelines and best practices.

## Resources
- [Website](https://selendra.org)
- [GitHub](https://github.com/selendra/explorer)

## License
[Apache License 2.0](LICENSE)
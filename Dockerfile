# ───────────────────────────────────────────────
# 1.  BUILD STAGE – compile the Rust binary
# ───────────────────────────────────────────────
FROM rustlang/rust:nightly-slim AS builder

# System deps needed by many crates (DuckDB, OpenSSL, CMake, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        cmake \
        ninja-build \
        libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Cache dependencies first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Compile the real project
COPY . .
RUN cargo build --release




# ───────────────────────────────────────────────
# 2.  RUNTIME STAGE – small, production image
#    (match builder: Debian Bookworm)
# ───────────────────────────────────────────────
FROM debian:bookworm-slim

# SSL certs + libssl3 for OpenSSL 3.0 runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
    && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/daggboard /usr/local/bin/daggboard

EXPOSE 3000
ENTRYPOINT ["daggboard"]
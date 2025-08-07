# dAggBoard

```
cargo run -- --rpc-url="https://mainnet.infura.io/v3/XXX"
```

```
docker build -t daggboard .

docker run --rm -p 3000:3000 \
  -v $(pwd)/data.duckdb:/app/data.duckdb \
  daggboard \
  --rpc-url https://mainnet.infura.io/v3/YOUR_KEY
```

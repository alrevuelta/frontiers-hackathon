# dAggBoard

```
cargo run -- --rpc-url="https://mainnet.infura.io/v3/XXX"
```

```
docker build -t agglayer-indexer .

docker run --rm -p 3000:3000 \
  agglayer-indexer \
  --rpc_url https://mainnet.infura.io/v3/YOUR_KEY
```
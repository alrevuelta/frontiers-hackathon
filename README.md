# dAggBoard

```
cargo run -- --rpc-url="https://mainnet.infura.io/v3/XXX"
```

```
docker build -t dagglayer .

docker run --rm -p 3000:3000 \
  -v $(pwd)/data.duckdb:/app/data.duckdb \
  dagglayer \
  --rpc_url https://mainnet.infura.io/v3/YOUR_KEY

```



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


rollups: Lists all connected rollups.
curl -G \
     --data-urlencode 'q=SELECT * FROM bridge_events LIMIT 5' \
     http://65.21.69.162:3000/query


curl "http://localhost:3000/table/rollups"

curl "http://localhost:3000/sync/{rollup_id}"
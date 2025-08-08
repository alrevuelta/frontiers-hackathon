# dAggBoard

`dAggBoard` is a dashboard for Polygon's [AggLayer](https://www.agglayer.dev/), a cross-chain settlement layer that connects the liquidity and users of any blockchain, enabling fast, low-cost interoperability and growth.

It consists of:
* A backend indexer written in **Rust** using **Alloy** to index all connected AggChains in real time. It stores the data in a **DuckDB** database and indexes all the events that happen in all AggChains connected to the Agglayer.
* A frontend that visualises bridges, claims, statistics, and more.

Built during **Frontiers 2025** in San Francisco. This is a hackathon prototype: untested and *not* intended for production use.

Frontend deployment: https://frontiers-hackathon.vercel.app/

Alternate frontend deployment: https://daggboard.vercel.app/

## run backend

Run as:
```
cargo run -- --rpc-url="https://mainnet.infura.io/v3/XXX"
```

Run with docker:
```
docker build -t daggboard .

docker run --rm -p 3000:3000 \
  -v $(pwd)/data.duckdb:/app/data.duckdb \
  daggboard \
  --rpc-url https://mainnet.infura.io/v3/YOUR_KEY
```

You can pass any raw query as follows. See the schema in the code.

```
curl -G \
     --data-urlencode 'q=SELECT * FROM bridge_events LIMIT 5' \
     http://127.0.0.1:3000/query
```

And there are other interesting endpoints.

```
curl "http://localhost:3000/table/rollups"
curl "http://localhost:3000/sync/{rollup_id}"
```


## run frontend

Run as follows:
```
npm run dev
```
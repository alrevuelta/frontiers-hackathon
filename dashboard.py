import streamlit as st
import requests
import pandas as pd
import json
from typing import List, Dict, Any, Tuple, Optional
import time
from collections import defaultdict
from eth_abi import abi
from concurrent.futures import ThreadPoolExecutor
import plotly.graph_objects as go

# Set page config
st.set_page_config(
    page_title="dAggBoard: Agglayer Dashboard",
    page_icon="🌉",
    layout="wide"
)
# Constants
BASE_URL = "http://65.21.69.162:3000"
ROLLUPS_ENDPOINT = f"{BASE_URL}/table/rollups"
WRAPPED_TOKEN_ENDPOINT = f"{BASE_URL}/table/new_wrapped_token_events/filter"
ASSET_BALANCE_ENDPOINT = f"{BASE_URL}/bridge_balance"
LIABILITY_BALANCE_ENDPOINT = f"{BASE_URL}/wrapped_balance"
SYNC_ENDPOINT = f"{BASE_URL}/sync"
ITEMS_PER_PAGE = 5

def get_sync_state(rollup_id: int) -> str:
    """Get the sync state for a rollup ID"""
    try:
        response = requests.get(f"{SYNC_ENDPOINT}/{rollup_id}")
        response.raise_for_status()
        distance = response.json().get("distance", None)
        if distance is None:
            return "❌ Could not sync. Endpoint down"
        elif distance == 0:
            return "✅ Synced"
        else:
            return f"⌛ Distance from head: {distance}"
    except requests.RequestException:
        return "❌ Could not sync. Endpoint down"

def display_sync_states(rollups: List[Dict[str, Any]]):
    """Display sync states for all rollups in parallel"""
    st.markdown("## Rollup Sync States")
    
    # Use ThreadPoolExecutor to fetch sync states in parallel
    with ThreadPoolExecutor() as executor:
        rollup_ids = [rollup.get("rollup_id", 0) for rollup in rollups]
        sync_states = list(executor.map(get_sync_state, rollup_ids))
    
    # Display sync states in columns
    num_columns = 3  # Number of columns to display
    columns = st.columns(num_columns)
    
    for idx, rollup in enumerate(rollups):
        rollup_id = rollup.get("rollup_id", 0)
        network_name = rollup.get("network_name", "Unknown Network")
        sync_state = sync_states[idx]
        
        col = columns[idx % num_columns]
        with col:
            st.markdown(f"- {network_name} (ID: {rollup_id}): {sync_state}")

def get_block_explorer_url(rollup_id: int, token_address: str) -> str:
    """Get the block explorer URL for a token address"""
    explorer = {
        0: "https://etherscan.io",
        1: "https://zkevm.polygonscan.com",
        2: "https://astar-zkevm.explorer.startale.com",
        3: "https://web3.okx.com/en-eu/explorer/xlayer",
        4: "https://oev.explorer.api3.org",
        5: "DONTKNOWTHEEXPLORERFORTHISONE",
        6: "https://witnesschain-blockscout.eu-north-2.gateway.fm",
        7: "DONTKNOWTHEEXPLORERFORTHISONE",
        8: "https://blockscout.wirexpaychain.com",
        9: "DONTKNOWTHEEXPLORERFORTHISONE",
        10: "DONTKNOWTHEEXPLORERFORTHISONE",
        11: "DONTKNOWTHEEXPLORERFORTHISONE",
        12: "DONTKNOWTHEEXPLORERFORTHISONE",
        13: "DONTKNOWTHEEXPLORERFORTHISONE",
        14: "DONTKNOWTHEEXPLORERFORTHISONE",
        15: "DONTKNOWTHEEXPLORERFORTHISONE"
    }.get(rollup_id, "DONTKNOWTHEEXPLORERFORTHISONE")
    return f"{explorer}/address/{token_address}"

def get_tx_explorer_url(rollup_id: int, tx_hash: str) -> str:
    """Return block explorer URL for a transaction hash given rollup."""
    explorer = {
        0: "https://etherscan.io",
        1: "https://zkevm.polygonscan.com",
        2: "https://astar-zkevm.explorer.startale.com",
        3: "https://web3.okx.com/en-eu/explorer/xlayer",
        4: "https://oev.explorer.api3.org",
        5: "DONTKNOWTHEEXPLORERFORTHISONE",
        6: "https://witnesschain-blockscout.eu-north-2.gateway.fm",
        7: "DONTKNOWTHEEXPLORERFORTHISONE",
        8: "https://blockscout.wirexpaychain.com",
        9: "DONTKNOWTHEEXPLORERFORTHISONE",
        10: "DONTKNOWTHEEXPLORERFORTHISONE",
        11: "DONTKNOWTHEEXPLORERFORTHISONE",
        12: "DONTKNOWTHEEXPLORERFORTHISONE",
        13: "DONTKNOWTHEEXPLORERFORTHISONE",
        14: "DONTKNOWTHEEXPLORERFORTHISONE",
        15: "DONTKNOWTHEEXPLORERFORTHISONE",
    }.get(rollup_id, "DONTKNOWTHEEXPLORERFORTHISONE")
    return f"{explorer}/tx/{tx_hash}"

# Helper functions
@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_rollups() -> List[Dict[str, Any]]:
    """Fetch all rollups from the API"""
    try:
        response = requests.get(ROLLUPS_ENDPOINT)
        response.raise_for_status()
        return response.json().get("data", [])
    except requests.RequestException as e:
        st.error(f"Error fetching rollups: {e}")
        return []

@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_wrapped_tokens(origin_network: int) -> List[Dict[str, Any]]:
    """Fetch wrapped tokens for a specific origin network"""
    # Ensure we have a valid int for origin_network (default to 0 if None)
    if origin_network is None:
        origin_network = 0
        
    try:
        response = requests.get(f"{WRAPPED_TOKEN_ENDPOINT}?originNetwork={origin_network}")
        response.raise_for_status()
        return response.json().get("data", [])
    except requests.RequestException as e:
        st.error(f"Error fetching wrapped tokens for network {origin_network}: {e}")
        return []

@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_asset_balance(rollup_id: int, token_address: str) -> str:
    """Fetch balance of an asset token for a specific rollup"""
    try:
        response = requests.get(f"{ASSET_BALANCE_ENDPOINT}?rollup_id={rollup_id}&token_address={token_address}")
        response.raise_for_status()
        balance = response.json().get("balance_bridge", "0")
        return format_token_amount(balance)
    except requests.RequestException as e:
        st.warning(f"Error fetching asset balance: {e}")
        return "Error"

@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_liability_balance(rollup_id: int, token_address: str) -> str:
    """Fetch balance of a liability token for a specific rollup"""
    try:
        response = requests.get(f"{LIABILITY_BALANCE_ENDPOINT}?rollup_id={rollup_id}&token_address={token_address}")
        response.raise_for_status()
        balance = response.json().get("circulating_supply", "0")
        return format_token_amount(balance)
    except requests.RequestException as e:
        st.warning(f"Error fetching liability balance: {e}")
        return "Error"
        
def format_token_amount(balance: str) -> str:
    """Format the token amount as an integer string."""
    # Assuming balance is provided in the smallest unit (e.g., wei)
    return balance

def get_paginated_data(data: List[Dict[str, Any]], page: int) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated data and total number of pages"""
    total_pages = (len(data) + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE
    start_idx = (page - 1) * ITEMS_PER_PAGE
    end_idx = start_idx + ITEMS_PER_PAGE
    return data[start_idx:end_idx], total_pages

def parse_metadata(metadata_hex: str) -> Dict[str, str]:
    """Parse metadata hex to extract token name and symbol"""
    result = {"name": "Unknown", "symbol": "Unknown"}
    try:
        decoded = abi.decode(['string', 'string'],
                            bytes.fromhex(metadata_hex[2:]))
        
        
    except Exception as e:
        st.warning(f"Failed to parse metadata: {e}")
    
    return decoded

def display_rollup_box(rollup: Dict[str, Any], key_prefix: str):
    """Display a box for a single rollup with merged assets and liabilities view"""
    rollup_id = rollup.get("rollup_id", 0)  # Default to 0 if None
    network_name = rollup.get("network_name", "Unknown Network")
    latest_block = rollup.get("latest_bridge_synced_block", 0)
    
    # Get wrapped tokens data 
    wrapped_tokens = fetch_wrapped_tokens(rollup_id)
    
    # Session state for pagination
    if f"{key_prefix}_{rollup_id}_page" not in st.session_state:
        st.session_state[f"{key_prefix}_{rollup_id}_page"] = 1
    
    # Group by originTokenAddress to show assets and their related liabilities
    assets_to_liabilities = defaultdict(list)
    
    if wrapped_tokens:
        for token in wrapped_tokens:
            origin_token = token.get("originTokenAddress")
            wrapped_token = token.get("wrappedTokenAddress")
            token_name = parse_metadata(token.get("metadata", "0x"))
            
            # Only show name and symbol if they were parsed successfully
            token_info = f"{origin_token if origin_token else 'Unknown Token'}"
            if token_name and token_name != "Unknown" and origin_token:
                token_info = f"{token_name} - {origin_token}"
            
            # Store token data without balances yet
            origin_network = token.get("originNetwork", 0)
            origin_rollup_id = origin_network  # Using origin_network as rollup_id for assets
            destination_rollup_id = token.get("rollup_id", 0)
            
            assets_to_liabilities[token_info].append({
                "Wrapped Token Address": wrapped_token,
                "Origin Network": origin_network,
                "Destination Rollup ID": destination_rollup_id,
                "Origin Token Address": origin_token,
                "Asset Balance": "Loading...",
                "Liability Balance": "Loading..."
            })
    
    # Convert to list for pagination
    merged_data = []
    for asset, liabilities in assets_to_liabilities.items():
        merged_data.append({
            "Asset": asset,
            "Liabilities Count": len(liabilities),
            "Liabilities": liabilities
        })
    
    # Pagination
    page = st.session_state[f"{key_prefix}_{rollup_id}_page"]
    paginated_data, total_pages = get_paginated_data(merged_data, page)
    
    # Display rollup name and latest block
    st.markdown(f"# 🔗 {network_name} (ID: {rollup_id})")
    st.markdown(f"Latest synced block: **{latest_block}**")
    
    if paginated_data:
        # Only fetch balances for visible items
        for item in paginated_data:
            # Get the first liability to extract asset information
            if item["Liabilities"]:
                first_liability = item["Liabilities"][0]
                origin_token = first_liability.get("Origin Token Address")
                origin_rollup_id = first_liability.get("Origin Network")
                
                # Fetch asset balance - this is for the parent asset
                if origin_token:
                    item["Asset Balance"] = fetch_asset_balance(origin_rollup_id, origin_token)
                else:
                    item["Asset Balance"] = "N/A"
                
                # Fetch liability balances for each wrapped token
                for liability in item["Liabilities"]:
                    wrapped_token = liability.get("Wrapped Token Address")
                    destination_rollup_id = liability.get("Destination Rollup ID")
                    
                    # Fetch liability balance
                    if wrapped_token:
                        liability["Liability Balance"] = fetch_liability_balance(destination_rollup_id, wrapped_token)
                    else:
                        liability["Liability Balance"] = "N/A"
            else:
                item["Asset Balance"] = "N/A"
        
        # Display the items with fetched balances
        for idx, item in enumerate(paginated_data):
            st.markdown(f"#### {item['Asset'].split(' - ')[0]}")
            # Create a unified table for asset and liabilities
            token_address = item['Asset'].split(' - ')[-1]
            asset_info = {
                "Token Name": item['Asset'].split(' - ')[0],
                "Token Address": f'<a href="{get_block_explorer_url(rollup_id, token_address)}" target="_blank">{token_address}</a>',
                "Asset Balance": item['Asset Balance']
            }
            liabilities_display = []
            total_liability_balance = 0  # Initialize as integer
            
            # Add liabilities information
            for liability in item['Liabilities']:
                l = liability.get("Wrapped Token Address")
                liabilities_display.append({
                    "Liability Address": f'<a href="{get_block_explorer_url(liability.get("Destination Rollup ID"), l)}" target="_blank">{liability.get("Wrapped Token Address")}</a>',
                    "Liability Balance": liability.get("Liability Balance"),
                    "Origin Network": liability.get("Origin Network"),
                    "Destination Rollup ID": liability.get("Destination Rollup ID")
                })
                
                # Sum up the liability balances using integers
                try:
                    total_liability_balance += int(liability["Liability Balance"].replace(',', ''))
                except ValueError:
                    pass
            
            # Create a unified markdown table without the "Token Name" column
            unified_table = "| 🔒Asset Address | 🔒Asset Balance | 💸Liability Address | 💸Liability Balance | 💸Liability Origin | 💸Liability Destination |\n"
            unified_table += "|---|---|---|---|---|---|\n"
            # Add asset information in the first row
            unified_table += f"| {asset_info['Token Address']} | {asset_info['Asset Balance']} | {liabilities_display[0]['Liability Address']} | {liabilities_display[0]['Liability Balance']} | {liabilities_display[0]['Origin Network']} | {liabilities_display[0]['Destination Rollup ID']} |\n"
            # Add remaining liabilities information in subsequent rows
            for liability in liabilities_display[1:]:
                unified_table += f"|  |  | {liability['Liability Address']} | {liability['Liability Balance']} | {liability['Origin Network']} | {liability['Destination Rollup ID']} |\n"
            
            # Calculate total liability balance using integers
            total_liability_balance = 0
            for liability in liabilities_display:
                try:
                    total_liability_balance += int(liability["Liability Balance"].replace(',', ''))
                except ValueError:
                    pass

            # Calculate the difference
            try:
                asset_balance = int(asset_info['Asset Balance'].replace(',', ''))
            except ValueError:
                asset_balance = 0

            diff = asset_balance - total_liability_balance
            diff_emoji = "❌" if diff < 0 else "✅"

            # Add total row
            unified_table += f"| **Total** | {asset_info['Asset Balance']} |  | {total_liability_balance} |  |  |\n"
            # Add diff row
            unified_table += f"| **Diff** | {diff} {diff_emoji} |  |  |  |  |\n"
            
            st.markdown(unified_table, unsafe_allow_html=True)
    else:
        st.info("No data available for this rollup")
    
    # Pagination controls at the bottom
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        #st.markdown("#### Pagination")
        cols = st.columns([1, 1, 1])
        with cols[0]:
            if st.button("⬅️ Previous", key=f"prev_{rollup_id}", disabled=(page == 1)):
                st.session_state[f"{key_prefix}_{rollup_id}_page"] = max(1, page - 1)
                st.rerun()
        with cols[1]:
            st.caption(f"Page {page} of {total_pages if total_pages > 0 else 1}")
        with cols[2]:
            if st.button("Next ➡️", key=f"next_{rollup_id}", disabled=(page >= total_pages)):
                st.session_state[f"{key_prefix}_{rollup_id}_page"] = min(total_pages, page + 1)
                st.rerun()
        
    
    st.markdown("---")

# Bridge Sankey diagram helpers
# Generic query helper
@st.cache_data(ttl=300)
def run_sql_query(sql: str) -> List[Dict[str, Any]]:
    """Run a SQL query against backend /query endpoint and return rows list."""
    try:
        resp = requests.get(f"{BASE_URL}/query", params={"q": sql})
        resp.raise_for_status()
        data = resp.json()
        # Endpoint may return list or dict with 'data'
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return data.get("data", [])
        else:
            return []
    except requests.RequestException as e:
        st.warning(f"Query failed: {e}")
        return []

# Optimized bridge-event fetches
@st.cache_data(ttl=300)
def fetch_bridge_events(chain_id: int, limit: int = 5000) -> List[Dict[str, Any]]:
    """Fetch recent bridge events for a specific chain (either origin or destination) limited to 'limit' rows."""
    sql = (
        "SELECT originNetwork, destinationNetwork, originAddress, block_number, transaction_hash, amount "
        "FROM bridge_events "
        f"WHERE originNetwork = {chain_id} OR destinationNetwork = {chain_id} "
        f"ORDER BY block_number DESC LIMIT {limit}"
    )
    return run_sql_query(sql)

@st.cache_data(ttl=120)
def fetch_latest_bridge_events(limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch the latest 'limit' bridge events across all networks."""
    sql = (
        "SELECT originNetwork, destinationNetwork, block_number, transaction_hash, amount "
        "FROM bridge_events ORDER BY block_number DESC LIMIT " + str(limit)
    )
    return run_sql_query(sql)

def display_bridge_sankey_per_chain(bridge_events: List[Dict[str, Any]], rollups: List[Dict[str, Any]]):
    """Render separate Sankey diagrams – one per destination chain – with total inbound bridge counts."""
    if not bridge_events:
        st.info("No bridge events data available.")
        return

    # Helper: map rollup_id -> human label
    id_to_name = {r.get("rollup_id"): r.get("network_name") for r in rollups}

    # Aggregate counts per (origin, destination)
    flows_by_dest: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    total_bridges = 0
    for evt in bridge_events:
        origin = evt.get("originNetwork")
        destination = evt.get("destinationNetwork")
        if origin is None or destination is None:
            continue
        flows_by_dest[destination][origin] += 1
        total_bridges += 1

    st.markdown(f"## 🌐 Total bridge events processed: **{total_bridges}**")

    # Create a Sankey diagram for each destination chain
    for dest, origins_dict in sorted(flows_by_dest.items()):
        total_inbound = sum(origins_dict.values())
        chain_label = id_to_name.get(dest, f"Network {dest}")
        st.markdown(f"### 🛬 Inbound bridges to **{chain_label}** (ID {dest}) — Total: **{total_inbound}**")

        # Prepare node list (all origins + destination)
        node_ids = list(sorted(origins_dict.keys())) + [dest]
        id_to_idx = {nid: idx for idx, nid in enumerate(node_ids)}
        labels = [id_to_name.get(nid, f"Network {nid}") for nid in node_ids]

        sources = [id_to_idx[orig] for orig in origins_dict.keys()]
        targets = [id_to_idx[dest]] * len(origins_dict)
        values = list(origins_dict.values())

        fig = go.Figure(data=[go.Sankey(
            node=dict(
                pad=15,
                thickness=20,
                line=dict(color="black", width=0.5),
                label=labels,
            ),
            link=dict(
                source=sources,
                target=targets,
                value=values,
            ))])

        fig.update_layout(margin=dict(l=10, r=10, t=25, b=10),
                          title_text=f"Inbound Bridge Flows to {chain_label}",
                          font_size=10)
        st.plotly_chart(fig, use_container_width=True)

def display_bridge_sankey_inbound_outbound(bridge_events: List[Dict[str, Any]], rollups: List[Dict[str, Any]], selected_chain: Optional[int] = None):
    """
    Render inbound and outbound Sankey diagrams.
    If selected_chain is None, renders for every chain, otherwise only for the chosen chain.
    Inbound: flows coming into the chain (origin ➜ destination=chain)
    Outbound: flows leaving the chain (origin=chain ➜ destination)
    """
    if not bridge_events:
        st.info("No bridge events data available.")
        return

    id_to_name = {r.get("rollup_id"): r.get("network_name") for r in rollups}

    # Identify all chains involved in the events
    chain_ids = set()
    for evt in bridge_events:
        o = evt.get("originNetwork")
        d = evt.get("destinationNetwork")
        if o is not None:
            chain_ids.add(o)
        if d is not None:
            chain_ids.add(d)

    # Aggregate inbound and outbound flows
    inbound_by_chain: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    outbound_by_chain: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for evt in bridge_events:
        origin = evt.get("originNetwork")
        destination = evt.get("destinationNetwork")
        if origin is None or destination is None or origin == destination:
            continue
        inbound_by_chain[destination][origin] += 1
        outbound_by_chain[origin][destination] += 1

    st.markdown(f"## 🌐 Total bridge events processed: **{len(bridge_events)}**")

    chains_to_plot = [selected_chain] if selected_chain is not None else sorted(chain_ids)
    for chain in chains_to_plot:
        inbound = inbound_by_chain.get(chain, {})
        outbound = outbound_by_chain.get(chain, {})
        total_in = sum(inbound.values())
        total_out = sum(outbound.values())
        chain_label = id_to_name.get(chain, f"Network {chain}")

        st.markdown(f"### 🔄 Bridge flows for **{chain_label}** (ID {chain}) — In: **{total_in}**, Out: **{total_out}**")

        col_in, col_out = st.columns(2)
        # Inbound diagram
        with col_in:
            st.caption("Inbound")
            if inbound:
                node_ids = sorted(inbound.keys()) + [chain]
                idx_map = {nid: idx for idx, nid in enumerate(node_ids)}
                labels = [id_to_name.get(nid, f"Network {nid}") for nid in node_ids]
                sources = [idx_map[o] for o in inbound.keys()]
                targets = [idx_map[chain]] * len(inbound)
                values = list(inbound.values())
                fig_in = go.Figure(data=[go.Sankey(node=dict(pad=15, thickness=20, line=dict(color="black", width=0.5), label=labels),
                                                   link=dict(source=sources, target=targets, value=values))])
                fig_in.update_layout(margin=dict(l=10, r=10, t=25, b=10), title_text=f"Inbound to {chain_label}", font_size=10)
                st.plotly_chart(fig_in, use_container_width=True)
            else:
                st.info("No inbound bridges")

        # Outbound diagram
        with col_out:
            st.caption("Outbound")
            if outbound:
                node_ids = [chain] + sorted(outbound.keys())
                idx_map = {nid: idx for idx, nid in enumerate(node_ids)}
                labels = [id_to_name.get(nid, f"Network {nid}") for nid in node_ids]
                sources = [idx_map[chain]] * len(outbound)
                targets = [idx_map[d] for d in outbound.keys()]
                values = list(outbound.values())
                fig_out = go.Figure(data=[go.Sankey(node=dict(pad=15, thickness=20, line=dict(color="black", width=0.5), label=labels),
                                                    link=dict(source=sources, target=targets, value=values))])
                fig_out.update_layout(margin=dict(l=10, r=10, t=25, b=10), title_text=f"Outbound from {chain_label}", font_size=10)
                st.plotly_chart(fig_out, use_container_width=True)
            else:
                st.info("No outbound bridges")

# --- Latest Bridge Transactions (Block Explorer-like) ---

def display_latest_bridge_transactions(bridge_events: List[Dict[str, Any]], rollups: List[Dict[str, Any]], limit: int = 20):
    """Show a table with the latest bridge transactions sorted by block number desc."""
    if not bridge_events:
        st.info("No bridge events available.")
        return

    # Sort by block number (numeric) descending
    sorted_events = sorted(
        bridge_events,
        key=lambda e: int(e.get("block_number", 0)),
        reverse=True,
    )[:limit]

    id_to_name = {r.get("rollup_id"): r.get("network_name") for r in rollups}

    display_rows = []
    for evt in sorted_events:
        block_num = evt.get("block_number")
        tx_hash = evt.get("transaction_hash")
        origin = evt.get("originNetwork")
        destination = evt.get("destinationNetwork")
        amount = evt.get("amount")
        link = get_tx_explorer_url(origin if origin is not None else 0, tx_hash)
        display_rows.append({
            "Block": block_num,
            "Tx": f'<a href="{link}" target="_blank">{tx_hash[:10]}…</a>',
            "Origin": id_to_name.get(origin, origin),
            "Destination": id_to_name.get(destination, destination),
            "Amount": amount,
        })

    st.markdown("### 🧩 Latest Bridge Transactions")
    st.markdown("Displays the most recent on-chain bridge events across all networks.")
    st.write(pd.DataFrame(display_rows))

# --- Top Addresses Pie Chart ---

def display_top_bridge_addresses_pie(bridge_events: List[Dict[str, Any]], origin_chain: int, top_n: int = 10):
    """Display a pie chart of the addresses that initiated the most bridges from the selected origin chain."""
    # Filter events where this chain is the origin
    filtered_events = [e for e in bridge_events if e.get("originNetwork") == origin_chain]
    if not filtered_events:
        st.info("No bridge events for this origin chain.")
        return

    address_counts: Dict[str, int] = defaultdict(int)
    for evt in filtered_events:
        addr = (evt.get("originAddress") or "").lower()
        if not addr:
            continue
        address_counts[addr] += 1

    # Take top N addresses
    top_addresses = sorted(address_counts.items(), key=lambda x: x[1], reverse=True)[:top_n]
    labels = [f"{addr[:6]}…{addr[-4:]}" for addr, _ in top_addresses]
    values = [count for _, count in top_addresses]

    fig = go.Figure(data=[go.Pie(labels=labels, values=values, hole=0.3)])
    fig.update_layout(title_text=f"Top {len(labels)} Bridging Addresses from Chain {origin_chain}")
    st.plotly_chart(fig, use_container_width=True)

# --- Bridge & Claim Counts Pie Charts ---
@st.cache_data(ttl=300)
def fetch_bridge_counts() -> List[Dict[str, Any]]:
    """Return aggregated bridge-event counts per network"""
    sql = "SELECT rollup_id AS network, COUNT(*) AS bridges FROM bridge_events GROUP BY rollup_id ORDER BY bridges DESC"
    return run_sql_query(sql)

@st.cache_data(ttl=300)
def fetch_claim_counts() -> List[Dict[str, Any]]:
    """Return aggregated claim-event counts per network"""
    sql = "SELECT rollup_id AS network, COUNT(*) AS claims FROM claim_events GROUP BY rollup_id ORDER BY claims DESC"
    return run_sql_query(sql)

def display_network_bridge_claim_pies(bridge_counts: List[Dict[str, Any]],
                                      claim_counts: List[Dict[str, Any]],
                                      rollups: List[Dict[str, Any]]):
    """Display two pie charts side-by-side: Bridge events vs Claim events per network."""
    if not bridge_counts and not claim_counts:
        st.info("No aggregated bridge/claim data available.")
        return

    id_to_name = {r.get("rollup_id"): r.get("network_name") for r in rollups}

    # Prepare bridge pie data
    bridge_labels = [id_to_name.get(int(row["network"]), str(row["network"])) for row in bridge_counts]
    bridge_values = [int(row["bridges"]) for row in bridge_counts]

    # Prepare claim pie data
    claim_labels = [id_to_name.get(int(row["network"]), str(row["network"])) for row in claim_counts]
    claim_values = [int(row["claims"]) for row in claim_counts]

    col_b, col_c = st.columns(2)
    with col_b:
        st.markdown("### 🌉 Bridge Events by Network")
        if bridge_values:
            fig_b = go.Figure(data=[go.Pie(labels=bridge_labels, values=bridge_values, hole=0.3)])
            fig_b.update_layout(title_text="Bridge Events Distribution")
            st.plotly_chart(fig_b, use_container_width=True)
        else:
            st.info("No bridge data available")

    with col_c:
        st.markdown("### 🔖 Claim Events by Network")
        if claim_values:
            fig_c = go.Figure(data=[go.Pie(labels=claim_labels, values=claim_values, hole=0.3)])
            fig_c.update_layout(title_text="Claim Events Distribution")
            st.plotly_chart(fig_c, use_container_width=True)
        else:
            st.info("No claim data available")

# --- Aggregated Bridge Flows (fast Sankey) ---

@st.cache_data(ttl=120)
def fetch_bridge_flows(chain_id: int) -> List[Dict[str, Any]]:
    """
    Fetch aggregated bridge flows for the given chain (both inbound and outbound),
    returning rows with columns: source (int), target (int), value (count).
    The query executes completely on the database side and is faster than
    transferring and post-processing raw events.
    """
    sql = (
        "WITH flows AS ("
        f" SELECT rollup_id AS source, destinationNetwork AS target "
        " FROM bridge_events "
        f" WHERE rollup_id = {chain_id} "
        " UNION ALL "
        " SELECT rollup_id AS source, destinationNetwork AS target "
        " FROM bridge_events "
        f" WHERE destinationNetwork = {chain_id}"
        ") "
        "SELECT source, target, COUNT(*) AS value "
        "FROM flows "
        "GROUP BY source, target "
        "ORDER BY value DESC"
    )
    return run_sql_query(sql)


def display_bridge_sankey_counts(bridge_flows: List[Dict[str, Any]], rollups: List[Dict[str, Any]], chain_id: int):
    """Render inbound/outbound Sankey diagrams based on pre-aggregated counts."""
    if not bridge_flows:
        st.info("No bridge flow data available.")
        return

    id_to_name = {r.get("rollup_id"): r.get("network_name") for r in rollups}

    inbound: Dict[int, int] = defaultdict(int)
    outbound: Dict[int, int] = defaultdict(int)

    for row in bridge_flows:
        try:
            src = int(row.get("source")) if row.get("source") is not None else None
            tgt = int(row.get("target")) if row.get("target") is not None else None
        except ValueError:
            continue
        val = int(row.get("value", 0))
        if src == chain_id and tgt is not None and tgt != chain_id:
            outbound[tgt] += val
        elif tgt == chain_id and src is not None and src != chain_id:
            inbound[src] += val

    total_in = sum(inbound.values())
    total_out = sum(outbound.values())
    chain_label = id_to_name.get(chain_id, f"Network {chain_id}")

    st.markdown(f"### 🔄 Bridge flows for **{chain_label}** (ID {chain_id}) — In: **{total_in}**, Out: **{total_out}**")

    col_in, col_out = st.columns(2)

    # Inbound diagram
    with col_in:
        st.caption("Inbound")
        if inbound:
            node_ids = sorted(inbound.keys()) + [chain_id]
            idx = {nid: idx for idx, nid in enumerate(node_ids)}
            labels = [id_to_name.get(nid, f"Network {nid}") for nid in node_ids]
            sources = [idx[s] for s in inbound.keys()]
            targets = [idx[chain_id]] * len(inbound)
            values = list(inbound.values())

            fig_in = go.Figure(data=[go.Sankey(
                node=dict(pad=15, thickness=20, line=dict(color="black", width=0.5), label=labels),
                link=dict(source=sources, target=targets, value=values)
            )])
            fig_in.update_layout(margin=dict(l=10, r=10, t=25, b=10),
                                 title_text=f"Inbound to {chain_label}",
                                 font_size=10)
            st.plotly_chart(fig_in, use_container_width=True)
        else:
            st.info("No inbound bridges")

    # Outbound diagram
    with col_out:
        st.caption("Outbound")
        if outbound:
            node_ids = [chain_id] + sorted(outbound.keys())
            idx = {nid: idx for idx, nid in enumerate(node_ids)}
            labels = [id_to_name.get(nid, f"Network {nid}") for nid in node_ids]
            sources = [idx[chain_id]] * len(outbound)
            targets = [idx[t] for t in outbound.keys()]
            values = list(outbound.values())

            fig_out = go.Figure(data=[go.Sankey(
                node=dict(pad=15, thickness=20, line=dict(color="black", width=0.5), label=labels),
                link=dict(source=sources, target=targets, value=values)
            )])
            fig_out.update_layout(margin=dict(l=10, r=10, t=25, b=10),
                                  title_text=f"Outbound from {chain_label}",
                                  font_size=10)
            st.plotly_chart(fig_out, use_container_width=True)
        else:
            st.info("No outbound bridges")

# Main app
def main():
    # Title and description
    st.title("🌉 Agglayer Balance Tracking Dashboard")
    st.markdown("""
    This dashboard tracks the assets and liabilities of the Agglayer.
    """)
    
    # Fetch rollups
    rollups = fetch_rollups()
    
    # Select a network to visualize bridge flows
    chain_options = {f"{r['network_name']} (ID {r['rollup_id']})": r['rollup_id'] for r in rollups}
    selected_chain_label = st.selectbox("Select Rollup / Network", list(chain_options.keys()))
    selected_chain_id = chain_options[selected_chain_label]

    # Fetch aggregated bridge flows (fast)
    bridge_flows = fetch_bridge_flows(selected_chain_id)

    # Show Sankey diagrams for the selected chain using aggregated counts
    display_bridge_sankey_counts(bridge_flows, rollups, selected_chain_id)

    # Fetch raw bridge events (limited) for other visualisations
    bridge_events = fetch_bridge_events(selected_chain_id)

    # Pie chart of top bridging addresses from the selected chain
    display_top_bridge_addresses_pie(bridge_events, selected_chain_id)

    # Network-wide bridge & claim counts pies
    bridge_counts = fetch_bridge_counts()
    claim_counts = fetch_claim_counts()
    display_network_bridge_claim_pies(bridge_counts, claim_counts, rollups)

    # Latest bridge transactions table (across all networks)
    latest_events = fetch_latest_bridge_events()
    display_latest_bridge_transactions(latest_events, rollups)
    
    if not rollups:
        st.error("⚠️ No rollups data available. Please check the API connection.")
        return
    
    # Display sync states
    display_sync_states(rollups)
    
    # Display info about rollups
    st.info(f"🔄 Found {len(rollups)} rollups connected to the bridge")
    
    # Add refresh button
    if st.button("🔄 Refresh Data"):
        # Clear cache and reload
        st.cache_data.clear()
        st.success("Data refreshed!")
        time.sleep(1)
        st.rerun()
    
    # Display the selected rollup using the same network selection above
    selected_rollup = next((r for r in rollups if r['rollup_id'] == selected_chain_id), None)
    if selected_rollup:
        display_rollup_box(selected_rollup, "rollup")

if __name__ == "__main__":
    main()

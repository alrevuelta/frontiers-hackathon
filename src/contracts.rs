use alloy::sol;

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    PolygonZkEVMBridge,
    "abi/PolygonZkEVMBridge.json"
);

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    PolygonZkEVMBridgeV2,
    "abi/PolygonZkEVMBridgeV2.json"
);

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    TransparentUpgradeableProxy,
    "abi/TransparentUpgradeableProxy.json"
);

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    PolygonRollupManager,
    "abi/PolygonRollupManager.json"
);

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    PolygonRollupBaseEtrog,
    "abi/PolygonRollupBaseEtrog.json"
);

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    ERC20,
    "abi/ERC20.json"
);

/* TODO: Maybe use this
sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    contract PolygonRollupManagerOld {
        event AddExistingRollup(
            uint32 indexed rollupID,
            uint64 forkID,
            address rollupAddress,
            uint64 chainID,
            uint8 rollupCompatibilityID,
            uint64 lastVerifiedBatchBeforeUpgrade
        );
    }
);
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Activity,
  Database,
  Coins,
} from 'lucide-react';
import { useRollup, useTokenStats, useSyncDistance, useFlowData } from '../hooks/useApi';
import { Card, CardHeader, CardBody, Button, Badge, Loading, ErrorMessage } from './ui';
import {
  formatDecimalAmount,
  formatBlockNumber,
  getNetworkName,
  getBlockExplorerUrl,
  shortenAddress,
} from '../utils/formatting';
import { SankeyChart } from './charts/SankeyChart';
import { ErrorBoundary } from './ErrorBoundary';

export function RollupDetailPage() {
  const { rollupId } = useParams<{ rollupId: string }>();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const rollupIdNum = parseInt(rollupId || '0', 10);
  const { data: rollup, loading: rollupLoading, error: rollupError, refetch: refetchRollup } = useRollup(rollupIdNum);
  const { data: tokenStats, loading: statsLoading, error: statsError, refetch: refetchStats, loadingMap, summary } = useTokenStats(rollupIdNum);
  const { data: syncDistance, loading: syncDistanceLoading, refetch: refetchSyncDistance } = useSyncDistance(rollupIdNum);
  const { data: flowData, loading: flowDataLoading, error: flowDataError, refetch: refetchFlowData } = useFlowData(rollupIdNum);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Just refresh the data without triggering sync
      refetchRollup();
      refetchStats();
      refetchSyncDistance();
      refetchFlowData();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1500);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (rollupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Loading text="Loading rollup details..." className="py-20" />
        </div>
      </div>
    );
  }

  if (rollupError || !rollup) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorMessage 
            message={rollupError || 'Rollup not found'} 
            onRetry={refetchRollup} 
          />
        </div>
      </div>
    );
  }

  const networkName = rollup.network_name || getNetworkName(rollup.rollup_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="mr-4 bg-white/15 border-white/30 text-white hover:bg-white/25 backdrop-blur-sm transition-all duration-300 shadow-lg"
              >
                Back
              </Button>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{networkName}</h1>
                <p className="text-emerald-100 text-sm sm:text-base">
                  Rollup #{rollup.rollup_id} • Detailed Analytics
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              loading={refreshing}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="bg-white/15 border-white/30 text-white hover:bg-white/25 backdrop-blur-sm transition-all duration-300 shadow-lg"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          <Card className="bg-gradient-to-br from-slate-700 to-gray-800 text-white shadow-xl border-0 depth-card hover:shadow-slate-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <Activity className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-gray-300 text-xs font-medium mb-1">Latest Block</p>
              <p className="text-lg font-bold text-white">
                {rollup.latest_bridge_synced_block 
                  ? formatBlockNumber(rollup.latest_bridge_synced_block)
                  : 'Not synced'
                }
              </p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-xl border-0 depth-card hover:shadow-purple-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <TrendingUp className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-purple-100 text-xs font-medium mb-1">Distance from Head</p>
              <div className="text-lg font-bold text-white">
                {syncDistanceLoading ? (
                  <Loading size="sm" />
                ) : syncDistance !== null && syncDistance !== undefined ? (
                  <span className={syncDistance === 0 ? 'text-emerald-300' : syncDistance < 100 ? 'text-amber-300' : 'text-red-300'}>
                    {syncDistance === 0 ? '✅ Synced' : `${syncDistance} blocks`}
                  </span>
                ) : (
                  'N/A'
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl border-0 depth-card hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <Database className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-emerald-100 text-xs font-medium mb-1">Total Assets (L1)</p>
              <div className="text-lg font-bold text-white">
                {summary.allLoaded ? (
                  formatDecimalAmount(summary.totalAssets.toString(), 2)
                ) : (
                  <div className="flex items-center justify-center">
                    <Loading size="sm" />
                    <span className="ml-2 text-sm">({summary.loadedCount}/{summary.totalCount})</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl border-0 depth-card hover:shadow-orange-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <Coins className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-orange-100 text-xs font-medium mb-1">Total Liabilities (L2)</p>
              <div className="text-lg font-bold text-white">
                {summary.allLoaded ? (
                  formatDecimalAmount(summary.totalLiabilities.toString(), 2)
                ) : (
                  <div className="flex items-center justify-center">
                    <Loading size="sm" />
                    <span className="ml-2 text-sm">({summary.loadedCount}/{summary.totalCount})</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl border-0 depth-card hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <Coins className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-indigo-100 text-xs font-medium mb-1">Wrapped Tokens</p>
              <div className="text-lg font-bold text-white">
                {statsLoading ? (
                  <Loading size="sm" />
                ) : (
                  summary.totalCount.toLocaleString()
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Bridge Flow Diagram */}
        <Card className="shadow-2xl border-0 bg-white depth-card overflow-hidden mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Bridge Transaction Flows</h2>
                <p className="text-purple-100 text-sm">Sankey diagram showing inbound and outbound bridge transactions</p>
              </div>
              <div className="flex items-center space-x-2">
                {flowDataLoading && (
                  <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-800 border-0 font-medium">
                    🔄 Loading flows
                  </Badge>
                )}
                {!flowDataLoading && flowData && (
                  <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 border-0 font-medium">
                    ✅ {flowData.length} flow connections
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {flowDataLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loading text="Loading bridge flow data..." />
              </div>
            ) : flowDataError ? (
              <div className="p-6">
                <ErrorMessage message={flowDataError} onRetry={refetchFlowData} />
              </div>
            ) : !flowData || flowData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No bridge flow data available</p>
                  <p className="text-sm mt-2">This rollup may not have any bridge transactions yet</p>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <ErrorBoundary>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <SankeyChart data={flowData} rollupId={rollupIdNum} height={500} />
                  </div>
                </ErrorBoundary>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Token Details */}
        <Card className="shadow-2xl border-0 bg-white depth-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-gray-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Bridge Token Mappings</h2>
                <p className="text-slate-300 text-sm">Individual token deposits and claims</p>
              </div>
              <div className="flex items-center space-x-2">
                {!summary.allLoaded && (
                  <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-800 border-0 font-medium">
                    🔄 Loading {summary.loadedCount}/{summary.totalCount}
                  </Badge>
                )}
                {summary.allLoaded && (
                  <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 border-0 font-medium">
                    ✅ All Loaded
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {statsLoading ? (
              <div className="p-8">
                <Loading text="Loading token mappings..." />
              </div>
            ) : statsError ? (
              <div className="p-6">
                <ErrorMessage message={statsError} onRetry={refetchStats} />
              </div>
            ) : !tokenStats || tokenStats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Coins className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No token mappings found</p>
                <p className="text-sm mt-2">This rollup may not have any bridge tokens yet</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="grid gap-4 p-6">
                  {(tokenStats as any[]).map((groupedToken: any) => {
                    const tokenMetadata = { name: groupedToken.token_name, symbol: groupedToken.token_symbol };
                    const originExplorerUrl = getBlockExplorerUrl(groupedToken.originNetwork, groupedToken.originTokenAddress);
                    const isLoading = groupedToken.loading || loadingMap.get(groupedToken.id);
                    
                    return (
                      <div key={groupedToken.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300 depth-card">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${groupedToken.is_balanced ? 'bg-emerald-400 shadow-lg shadow-emerald-400/30' : 'bg-amber-400 shadow-lg shadow-amber-400/30'}`} />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {tokenMetadata.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Symbol: {tokenMetadata.symbol} | Source Network: {getNetworkName(groupedToken.originNetwork)}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {groupedToken.liability_entries.length} destination{groupedToken.liability_entries.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                            <div className="text-emerald-600 font-semibold mb-2">Total deposits (assets)</div>
                            <div className="font-mono font-bold text-emerald-800 text-lg">
                              {isLoading ? (
                                <Loading size="sm" />
                              ) : (
                                formatDecimalAmount(groupedToken.assets_balance, 2)
                              )}
                            </div>
                            <div className="mt-2">
                              <a
                                href={originExplorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center transition-colors duration-200"
                              >
                                {shortenAddress(groupedToken.originTokenAddress)} <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                            <div className="text-amber-600 font-semibold mb-2">Total Claims (liability)</div>
                            <div className="font-mono font-bold text-amber-800 text-lg mb-3">
                              {isLoading ? (
                                <Loading size="sm" />
                              ) : (
                                formatDecimalAmount(groupedToken.total_liabilities, 2)
                              )}
                            </div>
                            <div className="text-xs text-amber-600 mb-3">
                              Across {groupedToken.liability_entries.length} destination{groupedToken.liability_entries.length !== 1 ? 's' : ''}
                            </div>
                            
                            {/* Individual liability breakdown within the claims box */}
                            <div className="border-t border-amber-200 pt-3 mt-3">
                              <div className="text-xs font-medium text-amber-700 mb-2">Individual Breakdown:</div>
                              <div className="space-y-2">
                                {groupedToken.liability_entries.map((liability: any) => {
                                  const liabilityExplorerUrl = getBlockExplorerUrl(liability.rollup_id, liability.wrappedTokenAddress);
                                  const liabilityIsLoading = liability.loading;
                                  
                                  return (
                                    <div key={liability.id} className="flex items-center justify-between p-2 bg-amber-100/50 rounded-md border border-amber-200">
                                      <div className="flex items-center space-x-2">
                                        <div className="text-xs">
                                          <div className="font-medium text-amber-800">
                                            {getNetworkName(liability.rollup_id)}
                                          </div>
                                          <a
                                            href={liabilityExplorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-amber-600 hover:text-amber-800 flex items-center transition-colors duration-200"
                                          >
                                            {shortenAddress(liability.wrappedTokenAddress)} <ExternalLink className="w-2 h-2 ml-1" />
                                          </a>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-semibold text-amber-800 text-xs">
                                          {liabilityIsLoading ? (
                                            <Loading size="sm" />
                                          ) : (
                                            formatDecimalAmount(liability.liability_balance, 2)
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
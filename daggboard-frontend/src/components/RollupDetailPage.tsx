import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Database,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { useRollup, useTokenStats, useEventCounts, useSyncDistance } from '../hooks/useApi';
import { Card, CardHeader, CardBody, Button, Badge, Loading, ErrorMessage } from './ui';
import {
  formatTokenAmount,
  formatBlockNumber,
  getNetworkName,
  getBlockExplorerUrl,
  shortenAddress,
  getBalanceStatus,
} from '../utils/formatting';

export function RollupDetailPage() {
  const { rollupId } = useParams<{ rollupId: string }>();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const rollupIdNum = parseInt(rollupId || '0', 10);
  const { data: rollup, loading: rollupLoading, error: rollupError, refetch: refetchRollup } = useRollup(rollupIdNum);
  const { data: tokenStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useTokenStats(rollupIdNum);
  const { bridgeCount, claimCount, loading: countsLoading, refetch: refetchCounts } = useEventCounts(rollupIdNum);
  const { data: syncDistance, loading: syncDistanceLoading, refetch: refetchSyncDistance } = useSyncDistance(rollupIdNum);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Just refresh the data without triggering sync
      refetchRollup();
      refetchStats();
      refetchCounts();
      refetchSyncDistance();
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

  // Calculate totals
  const totalAssets = tokenStats?.reduce((sum, token) => sum + parseFloat(token.assets_balance || '0'), 0) || 0;
  const totalLiabilities = tokenStats?.reduce((sum, token) => sum + parseFloat(token.liabilities_balance || '0'), 0) || 0;
  const totalDifference = totalAssets - totalLiabilities;
  const healthyTokens = tokenStats?.filter(token => token.is_balanced).length || 0;
  const unhealthyTokens = (tokenStats?.length || 0) - healthyTokens;

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
              <p className="text-emerald-100 text-xs font-medium mb-1">Bridge Events</p>
              <div className="text-lg font-bold text-white">
                {countsLoading ? <Loading size="sm" /> : bridgeCount.toLocaleString()}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl border-0 depth-card hover:shadow-orange-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <Coins className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-orange-100 text-xs font-medium mb-1">Claim Events</p>
              <div className="text-lg font-bold text-white">
                {countsLoading ? <Loading size="sm" /> : claimCount.toLocaleString()}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl border-0 depth-card hover:shadow-blue-500/30 hover:scale-105 transition-all duration-500">
            <CardBody className="text-center">
              <AlertTriangle className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-blue-100 text-xs font-medium mb-1">Total Tokens</p>
              <div className="text-lg font-bold text-white">
                {statsLoading ? <Loading size="sm" /> : (tokenStats?.length || 0)}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="border-0 shadow-xl depth-card bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="border-emerald-200">
              <h3 className="text-lg font-semibold text-emerald-800">Total Assets (L1)</h3>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-emerald-600">
                {statsLoading ? <Loading size="sm" /> : formatTokenAmount(totalAssets.toString(), 18, 2)}
              </div>
              <p className="text-sm text-emerald-600 mt-1">Locked in bridge contracts</p>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-xl depth-card bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-amber-500/10 transition-all duration-300">
            <CardHeader className="border-amber-200">
              <h3 className="text-lg font-semibold text-amber-800">Total Liabilities (L2)</h3>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-amber-600">
                {statsLoading ? <Loading size="sm" /> : formatTokenAmount(totalLiabilities.toString(), 18, 2)}
              </div>
              <p className="text-sm text-amber-600 mt-1">Claimed on rollups</p>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-xl depth-card bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-blue-500/10 transition-all duration-300">
            <CardHeader className="border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800">Net Difference</h3>
            </CardHeader>
            <CardBody>
              <div className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {statsLoading ? <Loading size="sm" /> : formatTokenAmount(Math.abs(totalDifference).toString(), 18, 2)}
              </div>
              <div className="flex items-center mt-1">
                {totalDifference > 0 && <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />}
                {totalDifference < 0 && <TrendingDown className="w-4 h-4 text-amber-500 mr-1" />}
                {totalDifference === 0 && <Minus className="w-4 h-4 text-blue-500 mr-1" />}
                <p className="text-sm text-slate-600">
                  {totalDifference > 0 && 'Overcollateralized'}
                  {totalDifference < 0 && 'Undercollateralized'}
                  {totalDifference === 0 && 'Perfectly balanced'}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="border-0 shadow-lg depth-card bg-gradient-to-br from-emerald-50 to-green-100 hover:shadow-emerald-500/10 transition-all duration-300 border border-emerald-200">
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-emerald-700 mb-1">
                {statsLoading ? <Loading size="sm" /> : healthyTokens}
              </div>
              <div className="text-sm text-emerald-600 font-semibold">Healthy Tokens</div>
              <div className="text-xs text-emerald-500 mt-1">Overcollateralized</div>
            </CardBody>
          </Card>
          
          <Card className="border-0 shadow-lg depth-card bg-gradient-to-br from-amber-50 to-orange-100 hover:shadow-amber-500/10 transition-all duration-300 border border-amber-200">
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-amber-700 mb-1">
                {statsLoading ? <Loading size="sm" /> : unhealthyTokens}
              </div>
              <div className="text-sm text-amber-600 font-semibold">At-Risk Tokens</div>
              <div className="text-xs text-amber-500 mt-1">Undercollateralized</div>
            </CardBody>
          </Card>
          
          <Card className="border-0 shadow-lg depth-card bg-gradient-to-br from-indigo-50 to-purple-100 hover:shadow-indigo-500/10 transition-all duration-300 border border-indigo-200">
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-indigo-700 mb-1">
                {statsLoading ? <Loading size="sm" /> : (tokenStats?.length || 0)}
              </div>
              <div className="text-sm text-indigo-600 font-semibold">Total Tokens</div>
              <div className="text-xs text-indigo-500 mt-1">Tracked assets</div>
            </CardBody>
          </Card>
        </div>

        {/* Token Details */}
        <Card className="shadow-2xl border-0 bg-white depth-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-gray-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Token Balance Analysis</h2>
                <p className="text-slate-300 text-sm">Assets vs Liabilities breakdown</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 border-0 font-medium">
                  ✅ {healthyTokens} Healthy
                </Badge>
                {unhealthyTokens > 0 && (
                  <Badge variant="warning" size="sm" className="bg-amber-100 text-amber-800 border-0 font-medium">
                    ⚠️ {unhealthyTokens} At Risk
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {statsLoading ? (
              <div className="p-8">
                <Loading text="Loading token analytics..." />
              </div>
            ) : statsError ? (
              <div className="p-6">
                <ErrorMessage message={statsError} onRetry={refetchStats} />
              </div>
            ) : !tokenStats || tokenStats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Coins className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No token data available yet</p>
                <p className="text-sm mt-2">Waiting for database initialization...</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="grid gap-4 p-6">
                  {tokenStats.map((token, index) => {
                    const balanceStatus = getBalanceStatus(token.difference);
                    const explorerUrl = getBlockExplorerUrl(rollupIdNum, token.token_address);
                    const differenceValue = parseFloat(token.difference);
                    
                    return (
                      <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300 depth-card">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${token.is_balanced ? 'bg-emerald-400 shadow-lg shadow-emerald-400/30' : 'bg-amber-400 shadow-lg shadow-amber-400/30'}`} />
                            <div>
                              <div className="font-semibold text-slate-900 font-mono text-sm">
                                {shortenAddress(token.token_address)}
                              </div>
                              <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-slate-500 hover:text-slate-700 flex items-center mt-1 transition-colors duration-200"
                              >
                                Explorer <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          </div>
                          <Badge
                            variant={token.is_balanced ? 'success' : 'warning'}
                            size="sm"
                            className={`${token.is_balanced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} font-medium`}
                          >
                            {balanceStatus.emoji} {balanceStatus.text}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                            <div className="text-emerald-600 font-semibold mb-2">Assets (L1)</div>
                            <div className="font-mono font-bold text-emerald-800 text-lg">
                              {formatTokenAmount(token.assets_balance, 18, 2)}
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                            <div className="text-amber-600 font-semibold mb-2">Liabilities (L2)</div>
                            <div className="font-mono font-bold text-amber-800 text-lg">
                              {formatTokenAmount(token.liabilities_balance, 18, 2)}
                            </div>
                          </div>
                          
                          <div className={`rounded-xl p-4 border ${differenceValue >= 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100' : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-100'}`}>
                            <div className={`font-semibold mb-2 ${differenceValue >= 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                              Net Difference
                            </div>
                            <div className={`font-mono font-bold text-lg ${differenceValue >= 0 ? 'text-blue-800' : 'text-slate-800'}`}>
                              {differenceValue >= 0 ? '+' : ''}
                              {formatTokenAmount(token.difference, 18, 2)}
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
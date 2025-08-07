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
import { useRollup, useTokenStats, useEventCounts } from '../hooks/useDatabase';
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

  const handleRefresh = async () => {
    setRefreshing(true);
    refetchRollup();
    refetchStats();
    refetchCounts();
    setTimeout(() => setRefreshing(false), 1500);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="mr-4 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
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
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg border-0 depth-card glow">
            <CardBody className="text-center">
              <Activity className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-blue-100 text-xs font-medium mb-1">Latest Block</p>
              <p className="text-lg font-bold text-white">
                {rollup.latest_bridge_synced_block 
                  ? formatBlockNumber(rollup.latest_bridge_synced_block)
                  : 'Not synced'
                }
              </p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg border-0 depth-card glow-green">
            <CardBody className="text-center">
              <Database className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-green-100 text-xs font-medium mb-1">Bridge Events</p>
              <p className="text-lg font-bold text-white">
                {countsLoading ? <Loading size="sm" /> : bridgeCount.toLocaleString()}
              </p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg border-0 depth-card glow-pink">
            <CardBody className="text-center">
              <Coins className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-purple-100 text-xs font-medium mb-1">Claim Events</p>
              <p className="text-lg font-bold text-white">
                {countsLoading ? <Loading size="sm" /> : claimCount.toLocaleString()}
              </p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg border-0 depth-card glow-purple">
            <CardBody className="text-center">
              <AlertTriangle className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-orange-100 text-xs font-medium mb-1">Total Tokens</p>
              <p className="text-lg font-bold text-white">
                {statsLoading ? <Loading size="sm" /> : (tokenStats?.length || 0)}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Total Assets (L1)</h3>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? <Loading size="sm" /> : formatTokenAmount(totalAssets.toString(), 18, 2)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Locked in bridge contracts</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Total Liabilities (L2)</h3>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? <Loading size="sm" /> : formatTokenAmount(totalLiabilities.toString(), 18, 2)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Claimed on rollups</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Net Difference</h3>
            </CardHeader>
            <CardBody>
              <div className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {statsLoading ? <Loading size="sm" /> : formatTokenAmount(Math.abs(totalDifference).toString(), 18, 2)}
              </div>
              <div className="flex items-center mt-1">
                {totalDifference > 0 && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
                {totalDifference < 0 && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
                {totalDifference === 0 && <Minus className="w-4 h-4 text-blue-500 mr-1" />}
                <p className="text-sm text-gray-600">
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
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-green-700 mb-1">
                {statsLoading ? <Loading size="sm" /> : healthyTokens}
              </div>
              <div className="text-sm text-green-600 font-medium">Healthy Tokens</div>
              <div className="text-xs text-green-500 mt-1">Overcollateralized</div>
            </CardBody>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-red-700 mb-1">
                {statsLoading ? <Loading size="sm" /> : unhealthyTokens}
              </div>
              <div className="text-sm text-red-600 font-medium">At-Risk Tokens</div>
              <div className="text-xs text-red-500 mt-1">Undercollateralized</div>
            </CardBody>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-blue-700 mb-1">
                {statsLoading ? <Loading size="sm" /> : (tokenStats?.length || 0)}
              </div>
              <div className="text-sm text-blue-600 font-medium">Total Tokens</div>
              <div className="text-xs text-blue-500 mt-1">Tracked assets</div>
            </CardBody>
          </Card>
        </div>

        {/* Token Details */}
        <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50 depth-card gradient-border">
          <CardHeader className="colorful-table-header rounded-t-xl animate-gradient-x">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-shadow">Token Balance Analysis</h2>
                <p className="text-purple-100 text-sm">Assets vs Liabilities breakdown</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success" size="sm" className="bg-green-100 text-green-800 border-0">
                  ✅ {healthyTokens} Healthy
                </Badge>
                {unhealthyTokens > 0 && (
                  <Badge variant="error" size="sm" className="bg-red-100 text-red-800 border-0">
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
                    const assetsValue = parseFloat(token.assets_balance);
                    const liabilitiesValue = parseFloat(token.liabilities_balance);
                    const differenceValue = parseFloat(token.difference);
                    
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${token.is_balanced ? 'bg-green-400' : 'bg-red-400'}`} />
                            <div>
                              <div className="font-semibold text-gray-900 font-mono text-sm">
                                {shortenAddress(token.token_address)}
                              </div>
                              <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center mt-1"
                              >
                                Explorer <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          </div>
                          <Badge
                            variant={token.is_balanced ? 'success' : 'error'}
                            size="sm"
                          >
                            {balanceStatus.emoji} {balanceStatus.text}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-green-600 font-medium mb-1">Assets (L1)</div>
                            <div className="font-mono font-bold text-green-800">
                              {formatTokenAmount(token.assets_balance, 18, 2)}
                            </div>
                          </div>
                          
                          <div className="bg-red-50 rounded-lg p-3">
                            <div className="text-red-600 font-medium mb-1">Liabilities (L2)</div>
                            <div className="font-mono font-bold text-red-800">
                              {formatTokenAmount(token.liabilities_balance, 18, 2)}
                            </div>
                          </div>
                          
                          <div className={`rounded-lg p-3 ${differenceValue >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                            <div className={`font-medium mb-1 ${differenceValue >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              Net Difference
                            </div>
                            <div className={`font-mono font-bold ${differenceValue >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
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
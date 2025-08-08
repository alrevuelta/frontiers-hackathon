import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Database, Layers, RefreshCw, ChevronRight } from 'lucide-react';
import { useRollups, useSyncDistances, useBridgeEventCounts, useClaimEventCounts } from '../hooks/useApi';
import { Card, CardHeader, CardBody, Button, Loading, ErrorMessage } from './ui';
import { formatBlockNumber, getNetworkName } from '../utils/formatting';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function HomePage() {
  const navigate = useNavigate();
  const { data: rollups, loading, error, refetch } = useRollups();
  const { data: bridgeEventCounts, loading: bridgeCountsLoading, refetch: refetchBridgeCounts } = useBridgeEventCounts();
  const { data: claimEventCounts, loading: claimCountsLoading, refetch: refetchClaimCounts } = useClaimEventCounts();
  const { distances, loadingStates, refetch: refetchDistances } = useSyncDistances(rollups || []);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate totals
  const totalBridgeEvents = (bridgeEventCounts || []).reduce((sum, item) => sum + parseInt(item.bridges), 0);
  const totalClaimEvents = (claimEventCounts || []).reduce((sum, item) => sum + parseInt(item.claims), 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Just refresh the data without triggering sync
      refetch();
      refetchDistances();
      refetchBridgeCounts();
      refetchClaimCounts();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleRollupClick = (rollupId: number) => {
    navigate(`/rollup/${rollupId}`);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">dAggBoard</h1>
            <p className="text-gray-600">AggLayer Bridge Analytics</p>
          </div>
          <Loading text="Loading rollups..." className="py-20" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">dAggBoard</h1>
            <p className="text-gray-600">AggLayer Bridge Analytics</p>
          </div>
          <ErrorMessage message={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                dAggBoard
                <span className="block text-lg sm:text-xl font-normal text-emerald-100 mt-2">
                  AggLayer Bridge Analytics
                </span>
              </h1>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-slate-700 to-gray-800 text-white shadow-2xl border-0 depth-card hover:shadow-slate-500/30 hover:scale-105 transition-all duration-500">
            <CardBody>
              <div className="flex items-center">
                <div className="bg-emerald-500/20 p-3 rounded-xl mr-4 backdrop-blur-sm border border-emerald-400/30 shadow-lg">
                  <Layers className="w-8 h-8 text-emerald-300" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm font-medium">Total Rollups</p>
                  <p className="text-3xl font-bold text-white">{rollups?.length || 0}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl border-0 depth-card hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-500">
            <CardBody>
              <div className="flex items-center">
                <div className="bg-white/20 p-3 rounded-xl mr-4 backdrop-blur-sm border border-white/30 shadow-lg">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Bridge Events</p>
                  <div className="text-3xl font-bold text-white">
                    {bridgeCountsLoading ? <Loading size="sm" /> : totalBridgeEvents.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-2xl border-0 depth-card hover:shadow-orange-500/30 hover:scale-105 transition-all duration-500">
            <CardBody>
              <div className="flex items-center">
                <div className="bg-white/20 p-3 rounded-xl mr-4 backdrop-blur-sm border border-white/30 shadow-lg">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-orange-100 text-sm font-medium">Claim Events</p>
                  <div className="text-3xl font-bold text-white">
                    {claimCountsLoading ? <Loading size="sm" /> : totalClaimEvents.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bridge Events Distribution */}
          <Card className="shadow-2xl border-0 bg-white depth-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <h3 className="text-lg font-semibold">Bridge Events Distribution</h3>
              <p className="text-emerald-100 text-sm">Events by rollup network</p>
            </CardHeader>
            <CardBody className="p-6">
              {bridgeCountsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loading text="Loading bridge data..." />
                </div>
              ) : !bridgeEventCounts || bridgeEventCounts.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p>No bridge data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={bridgeEventCounts.map(item => ({
                        name: getNetworkName(parseInt(item.network)),
                        value: parseInt(item.bridges),
                        networkId: parseInt(item.network)
                      }))}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {bridgeEventCounts.map((_, index) => {
                        const colors = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
                        return <Cell key={`bridge-cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Events']}
                      labelFormatter={(label) => `Network: ${label}`}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          {/* Claim Events Distribution */}
          <Card className="shadow-2xl border-0 bg-white depth-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <h3 className="text-lg font-semibold">Claim Events Distribution</h3>
              <p className="text-orange-100 text-sm">Claims by rollup network</p>
            </CardHeader>
            <CardBody className="p-6">
              {claimCountsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loading text="Loading claim data..." />
                </div>
              ) : !claimEventCounts || claimEventCounts.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p>No claim data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={claimEventCounts.map(item => ({
                        name: getNetworkName(parseInt(item.network)),
                        value: parseInt(item.claims),
                        networkId: parseInt(item.network)
                      }))}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {claimEventCounts.map((_, index) => {
                        const colors = ['#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#0ea5e9', '#10b981', '#84cc16'];
                        return <Cell key={`claim-cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Claims']}
                      labelFormatter={(label) => `Network: ${label}`}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Rollup Overview Tables */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="shadow-2xl border-0 bg-white depth-card overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-gray-900 text-white">
              <h3 className="text-lg font-semibold">Rollup Networks Overview</h3>
              <p className="text-slate-300 text-sm">Current status and sync information</p>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8">
                  <Loading text="Loading rollup data..." />
                </div>
              ) : !rollups || !Array.isArray(rollups) || rollups.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No rollup data available yet</p>
                  <p className="text-sm mt-2">Waiting for database initialization...</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Network</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Latest Block</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Distance from Head</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {(rollups || [])
                        .sort((a, b) => {
                          // First handle -1 (endpoint down) - put them at the end
                          const aEndpointDown = a.latest_bridge_synced_block === -1;
                          const bEndpointDown = b.latest_bridge_synced_block === -1;
                          
                          if (aEndpointDown && !bEndpointDown) return 1; // a goes to end
                          if (!aEndpointDown && bEndpointDown) return -1; // b goes to end
                          if (aEndpointDown && bEndpointDown) return 0; // both equal
                          
                          // Then sort by block number descending for healthy rollups
                          const blockA = a.latest_bridge_synced_block || 0;
                          const blockB = b.latest_bridge_synced_block || 0;
                          return Number(blockB) - Number(blockA);
                        })
                        .map((rollup) => {
                        const networkName = rollup.network_name || getNetworkName(rollup.rollup_id);
                        const distance = distances.get(rollup.rollup_id);
                        const isEndpointDown = rollup.latest_bridge_synced_block === -1;
                        
                        return (
                          <tr key={rollup.rollup_id} className="hover:bg-emerald-50/50 transition-all duration-200 hover:shadow-sm">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900">{networkName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                #{rollup.rollup_id}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                              {isEndpointDown ? (
                                <span className="text-red-600 font-medium">Could not sync. Endpoint down</span>
                              ) : rollup.latest_bridge_synced_block ? (
                                formatBlockNumber(rollup.latest_bridge_synced_block)
                              ) : (
                                'Not synced'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                              {isEndpointDown ? (
                                <span className="text-red-600">🚨 Endpoint down</span>
                              ) : distance !== undefined ? (
                                <span className={`${distance === 0 ? 'text-emerald-600 font-semibold' : distance < 100 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {distance === 0 ? '✅ Synced' : `${distance} blocks`}
                                </span>
                              ) : loadingStates.get(rollup.rollup_id) ? (
                                <Loading size="sm" />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Button
                                onClick={() => handleRollupClick(rollup.rollup_id)}
                                variant="outline"
                                size="sm"
                                rightIcon={<ChevronRight className="w-4 h-4" />}
                                className="hover:bg-emerald-100 hover:border-emerald-300 transition-colors duration-200"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Click "View Details" to explore comprehensive analytics for each rollup</p>
        </div>
      </div>
    </div>
  );
}
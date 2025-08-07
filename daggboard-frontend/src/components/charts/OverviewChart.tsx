import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { Rollup } from '../../utils/database';
import { formatBlockNumber, getNetworkName } from '../../utils/formatting';

export interface OverviewChartProps {
  rollups: Rollup[];
  type?: 'sync-status' | 'network-distribution';
  height?: number;
}

export function OverviewChart({ rollups, type = 'sync-status', height = 300 }: OverviewChartProps) {
  if (!rollups || rollups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available for chart
      </div>
    );
  }

  if (type === 'network-distribution') {
    const networkData = rollups.map((rollup) => ({
      name: rollup.network_name || getNetworkName(rollup.rollup_id),
      value: 1,
      rollupId: rollup.rollup_id,
      isSynced: rollup.latest_bridge_synced_block && rollup.latest_bridge_synced_block > 0,
    }));

    const COLORS = [
      '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
      '#14b8a6', '#f97316', '#a855f7', '#059669'
    ];

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
            <p className="font-medium text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-600">Rollup ID: {data.rollupId}</p>
            <p className="text-sm">
              Status: <span className={data.isSynced ? 'text-green-600' : 'text-red-600'}>
                {data.isSynced ? 'Synced' : 'Not Synced'}
              </span>
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={networkData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name }) => name}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {networkData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isSynced ? COLORS[index % COLORS.length] : '#94a3b8'}
                stroke={entry.isSynced ? undefined : '#ef4444'}
                strokeWidth={entry.isSynced ? undefined : 2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Sync status chart
  const syncData = rollups.map((rollup) => {
    const blockNumber = rollup.latest_bridge_synced_block || 0;
    return {
      name: rollup.network_name || getNetworkName(rollup.rollup_id),
      blockNumber: Number(blockNumber),
      rollupId: rollup.rollup_id,
      isSynced: blockNumber > 0,
    };
  }).sort((a, b) => b.blockNumber - a.blockNumber);

  const CustomSyncTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">Rollup ID: {data.rollupId}</p>
          <p className="text-sm">
            Latest Block: {data.isSynced ? formatBlockNumber(data.blockNumber) : 'Not synced'}
          </p>
          <p className="text-sm">
            Status: <span className={data.isSynced ? 'text-green-600' : 'text-red-600'}>
              {data.isSynced ? 'Synced' : 'Not Synced'}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={syncData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => formatBlockNumber(value)}
        />
        <Tooltip content={<CustomSyncTooltip />} />
        <Area
          type="monotone"
          dataKey="blockNumber"
          stroke="#0ea5e9"
          fill="#0ea5e9"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
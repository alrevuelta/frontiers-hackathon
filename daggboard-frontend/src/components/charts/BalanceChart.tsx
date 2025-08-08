import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { TokenStats } from '../../utils/api';
import { formatTokenAmount, shortenAddress } from '../../utils/formatting';

export interface BalanceChartProps {
  data: TokenStats[];
  type?: 'bar' | 'pie';
  height?: number;
}

interface TooltipPayload {
  payload: {
    fullAddress: string;
    assets: number;
    liabilities: number;
    difference: number;
    isBalanced: boolean;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

export function BalanceChart({ data, type = 'bar', height = 300 }: BalanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available for chart
      </div>
    );
  }

  // Transform data for charts
  const chartData = data.map((token) => ({
    name: shortenAddress(token.token_address),
    fullAddress: token.token_address,
    assets: parseFloat(token.assets_balance),
    liabilities: parseFloat(token.liabilities_balance),
    difference: parseFloat(token.difference),
    isBalanced: token.is_balanced,
  })).slice(0, 10); // Show top 10 tokens

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900 mb-2">{data.fullAddress}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-green-600">Assets: </span>
              {formatTokenAmount(data.assets.toString(), 18, 4)}
            </p>
            <p className="text-sm">
              <span className="text-red-600">Liabilities: </span>
              {formatTokenAmount(data.liabilities.toString(), 18, 4)}
            </p>
            <p className="text-sm">
              <span className={`${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Difference: {formatTokenAmount(Math.abs(data.difference).toString(), 18, 4)}
              </span>
            </p>
            <p className="text-sm">
              <span className={`${data.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                Status: {data.isBalanced ? 'Healthy' : 'At Risk'}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (type === 'pie') {
    const pieData = chartData.map((token) => ({
      name: token.name,
      value: token.assets,
      isBalanced: token.isBalanced,
    }));

    const COLORS = [
      '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isBalanced ? COLORS[index % COLORS.length] : '#ef4444'} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
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
        />
        <YAxis 
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => formatTokenAmount(value.toString(), 18, 2)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar 
          dataKey="assets" 
          fill="#10b981" 
          name="Assets (L1)"
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="liabilities" 
          fill="#ef4444" 
          name="Liabilities (L2)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
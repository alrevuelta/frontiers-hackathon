import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { TokenStats } from '../../utils/api';

export interface HealthStatusChartProps {
  data: TokenStats[];
  type?: 'pie' | 'bar';
  height?: number;
}

interface PieTooltipPayload {
  name: string;
  value: number;
  payload: {
    percentage: number;
  };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayload[];
}

interface BarTooltipPayload {
  count: number;
  percentage: number;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: { payload: BarTooltipPayload }[];
  label?: string;
}

export function HealthStatusChart({ data, type = 'pie', height = 300 }: HealthStatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available for chart
      </div>
    );
  }

  // Calculate health statistics
  const healthyTokens = data.filter(token => token.is_balanced).length;
  const atRiskTokens = data.filter(token => !token.is_balanced).length;
  const overcollateralized = data.filter(token => parseFloat(token.difference) > 0).length;
  const undercollateralized = data.filter(token => parseFloat(token.difference) < 0).length;
  const perfectlyBalanced = data.filter(token => parseFloat(token.difference) === 0).length;

  const CustomTooltip = ({ active, payload }: PieTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{data.value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-medium">{data.payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (type === 'pie') {
    const pieData = [
      {
        name: 'Healthy',
        value: healthyTokens,
        percentage: (healthyTokens / data.length) * 100,
        color: '#10b981',
      },
      {
        name: 'At Risk',
        value: atRiskTokens,
        percentage: (atRiskTokens / data.length) * 100,
        color: '#ef4444',
      },
    ].filter(item => item.value > 0);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Bar chart showing balance distribution
  const barData = [
    {
      name: 'Overcollateralized',
      count: overcollateralized,
      percentage: (overcollateralized / data.length) * 100,
      color: '#10b981',
    },
    {
      name: 'Perfectly Balanced',
      count: perfectlyBalanced,
      percentage: (perfectlyBalanced / data.length) * 100,
      color: '#0ea5e9',
    },
    {
      name: 'Undercollateralized',
      count: undercollateralized,
      percentage: (undercollateralized / data.length) * 100,
      color: '#ef4444',
    },
  ];

  const BarTooltip = ({ active, payload, label }: BarTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={barData}
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
        />
        <Tooltip content={<BarTooltip />} />
        <Bar 
          dataKey="count" 
          fill="#0ea5e9"
          radius={[4, 4, 0, 0]}
        >
          {barData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
import { ResponsiveSankey } from '@nivo/sankey';
import type { FlowData } from '../../utils/api';

export interface SankeyChartProps {
  data: FlowData[];
  height?: number;
}

export function SankeyChart({ height = 400 }: Omit<SankeyChartProps, 'data'>) {
  // HARDCODED TEST DATA - Remove API dependency for now
  const hardcodedData = {
    nodes: [
      { id: "0", label: "Ethereum" },
      { id: "1", label: "Polygon zkEVM" },
      { id: "3", label: "X Layer" },
      { id: "7", label: "Unknown Network" },
      { id: "8", label: "Wirex Pay Chain" }
    ],
    links: [
      { source: "0", target: "1", value: 202884 },
      { source: "1", target: "0", value: 57639 },
      { source: "0", target: "3", value: 7990 },
      { source: "3", target: "0", value: 6834 },
      { source: "0", target: "8", value: 458 },
      { source: "8", target: "0", value: 105 }
    ]
  };

  console.log('Using hardcoded Sankey data:', hardcodedData);

  return (
    <div style={{ height }}>
      <ResponsiveSankey
        data={hardcodedData}
        margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
        align="justify"
        colors={{ scheme: 'category10' }}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={18}
        nodeSpacing={24}
        nodeBorderWidth={0}
        nodeBorderColor={{
          from: 'color',
          modifiers: [['darker', 0.8]]
        }}
        nodeBorderRadius={3}
        linkOpacity={0.5}
        linkHoverOthersOpacity={0.1}
        linkContract={3}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="vertical"
        labelPadding={16}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 1]]
        }}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 130,
            itemWidth: 100,
            itemHeight: 14,
            itemDirection: 'right-to-left',
            itemsSpacing: 2,
            itemTextColor: '#999',
            symbolSize: 14,
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#000'
                }
              }
            ]
          }
        ]}
        nodeTooltip={({ node }) => (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
            <div className="font-medium text-gray-900 mb-1">
              {node.label}
            </div>
            <div className="text-sm text-gray-600">
              Network ID: {node.id}
            </div>
          </div>
        )}
        linkTooltip={({ link }) => (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
            <div className="font-medium text-gray-900 mb-1">
              Flow Connection
            </div>
            <div className="text-sm text-gray-600">
              {link.value.toLocaleString()} bridge transactions
            </div>
          </div>
        )}
      />
    </div>
  );
}
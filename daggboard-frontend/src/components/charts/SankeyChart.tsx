import { ResponsiveSankey } from '@nivo/sankey';
import type { FlowData } from '../../utils/api';

export interface SankeyChartProps {
  data: FlowData[];
  rollupId: number;
  height?: number;
}

interface SankeyData {
  nodes: { id: string; label: string }[];
  links: { source: string; target: string; value: number }[];
}

export function SankeyChart({ data, rollupId, height = 400 }: SankeyChartProps) {
  // Separate inflows and outflows
  const inflows = data.filter(flow => flow.target === rollupId.toString());
  const outflows = data.filter(flow => flow.source === rollupId.toString());

  console.log('Flow data:', { data, rollupId, inflows, outflows });

  // Transform inflows into Sankey format
  const createInflowData = (): SankeyData => {
    const uniqueSourceNodes = new Set(inflows.map(flow => flow.source));
    const nodes = [
      ...Array.from(uniqueSourceNodes).map(id => ({ id, label: `Network ${id}` })),
      { id: rollupId.toString(), label: `Network ${rollupId}` }
    ];
    
    const links = inflows.map(flow => ({
      source: flow.source,
      target: flow.target,
      value: parseInt(flow.value) || 0
    })).filter(link => link.value > 0 && link.source !== link.target);

    return { nodes, links };
  };

  // Transform outflows into Sankey format
  const createOutflowData = (): SankeyData => {
    const uniqueTargetNodes = new Set(outflows.map(flow => flow.target));
    const nodes = [
      { id: rollupId.toString(), label: `Network ${rollupId}` },
      ...Array.from(uniqueTargetNodes).map(id => ({ id, label: `Network ${id}` }))
    ];
    
    const links = outflows.map(flow => ({
      source: flow.source,
      target: flow.target,
      value: parseInt(flow.value) || 0
    })).filter(link => link.value > 0 && link.source !== link.target);

    return { nodes, links };
  };

  const inflowData = createInflowData();
  const outflowData = createOutflowData();

  const SankeyVisualization = ({ sankeyData, title }: { sankeyData: SankeyData; title: string }) => (
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      <div style={{ height: height - 40 }}>
        {sankeyData.links.length > 0 ? (
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 20, right: 120, bottom: 20, left: 50 }}
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
                  Bridge Flow
                </div>
                <div className="text-sm text-gray-600">
                  {link.value.toLocaleString()} transactions
                </div>
              </div>
            )}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No data available</p>
              <p className="text-sm">No bridge events found for this flow direction</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height }} className="w-full">
      <div className="flex gap-6 h-full">
        <SankeyVisualization 
          sankeyData={inflowData} 
          title="Inflow of bridge events" 
        />
        <SankeyVisualization 
          sankeyData={outflowData} 
          title="Outflow of bridge events" 
        />
      </div>
    </div>
  );
}
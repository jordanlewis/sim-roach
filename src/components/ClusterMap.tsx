import { motion } from 'framer-motion';
import { Node, Range } from '../types';

interface ClusterMapProps {
  nodes: Node[];
  ranges: Range[];
  onNodeClick: (nodeId: string) => void;
}

export default function ClusterMap({ nodes, ranges, onNodeClick }: ClusterMapProps) {
  // Group nodes by region
  const regions = [...new Set(nodes.map(node => node.region))];
  
  // Get ranges for a specific node
  const getRangesForNode = (nodeId: string) => {
    return ranges.filter(range => range.replicas.includes(nodeId));
  };
  
  // Check if node is a leaseholder for a range
  const isLeaseholder = (nodeId: string, rangeId: string) => {
    const range = ranges.find(r => r.id === rangeId);
    return range ? range.leaseholder === nodeId : false;
  };
  
  // Calculate position for regions in a grid
  const regionPositions: Record<string, { x: number, y: number }> = {};
  const gridSize = Math.ceil(Math.sqrt(regions.length));
  
  regions.forEach((region, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    regionPositions[region] = { 
      x: col * 100 / (gridSize - 1 || 1), 
      y: row * 100 / (gridSize - 1 || 1) 
    };
  });
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: '#f3f4f6' }}>
      <h2 className="text-xl font-bold mb-4">Cluster Map</h2>
      
      <div className="relative w-full" style={{ height: '500px' }}>
        {/* Region areas */}
        {regions.map(region => {
          const regionNodes = nodes.filter(node => node.region === region);
          const zones = [...new Set(regionNodes.map(node => node.zone))];
          const pos = regionPositions[region];
          
          return (
            <div 
              key={region}
              className="absolute border rounded-lg p-3"
              style={{ 
                left: `${pos.x}%`, 
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${90 / gridSize}%`,
                height: `${90 / gridSize}%`,
                borderColor: '#d1d5db',
                backgroundColor: 'rgba(255, 255, 255, 0.7)'
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#1f2937' }}>
                {region}
              </h3>
              
              <div className="flex flex-wrap justify-around h-[80%]">
                {zones.map(zone => {
                  const zoneNodes = regionNodes.filter(node => node.zone === zone);
                  
                  return (
                    <div key={zone} className="flex flex-col items-center">
                      <span className="text-xs mb-1" style={{ color: '#6b7280' }}>{zone}</span>
                      
                      <div className="flex flex-wrap justify-center gap-2">
                        {zoneNodes.map(node => {
                          const nodeRanges = getRangesForNode(node.id);
                          
                          return (
                            <motion.div
                              key={node.id}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onNodeClick(node.id)}
                              className="relative flex flex-wrap justify-center items-center cursor-pointer
                                shadow-md rounded-lg p-1"
                              style={{ 
                                width: '60px',
                                height: '60px',
                                backgroundColor: node.status === 'online' ? 'white' : '#fecaca',
                                border: `2px solid ${node.status === 'online' ? '#22c55e' : '#ef4444'}`
                              }}
                              title={`Node ${node.id} (${node.status})`}
                            >
                              <div className="absolute top-0 left-0 right-0 text-center text-xs font-bold py-0.5"
                                   style={{ backgroundColor: node.status === 'online' ? '#22c55e' : '#ef4444', color: 'white' }}>
                                {node.id}
                              </div>
                              
                              <div className="flex flex-wrap justify-center gap-1 mt-4">
                                {nodeRanges.map(range => (
                                  <div 
                                    key={range.id}
                                    className="w-3 h-3 rounded-sm flex items-center justify-center"
                                    style={{ 
                                      backgroundColor: isLeaseholder(node.id, range.id) ? '#3b82f6' : '#9ca3af',
                                      border: range.load > 50 ? '1px solid #f97316' : 'none',
                                    }}
                                    title={`Range ${range.id} ${isLeaseholder(node.id, range.id) ? '(Leaseholder)' : ''} - ${range.load} RPS`}
                                  >
                                    <span className="text-[6px] text-white font-bold">
                                      {range.id.replace('r', '')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-center items-center gap-6">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></div>
          <span className="text-xs">Leaseholder</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#9ca3af' }}></div>
          <span className="text-xs">Replica</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#9ca3af', border: '1px solid #f97316' }}></div>
          <span className="text-xs">Hot Range</span>
        </div>
      </div>
    </div>
  );
}

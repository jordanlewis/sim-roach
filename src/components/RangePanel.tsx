import { motion } from 'framer-motion';
import { Range, Node } from '../types';

interface RangePanelProps {
  ranges: Range[];
  nodes: Node[];
  onMarkRangeHot: (rangeId: string) => void;
}

export default function RangePanel({ ranges, nodes, onMarkRangeHot }: RangePanelProps) {
  // Get node by ID helper
  const getNodeById = (nodeId: string) => nodes.find(node => node.id === nodeId);
  
  // Get leaseholder node
  const getLeaseholderNode = (range: Range) => getNodeById(range.leaseholder);
  
  // Get replica location summary
  const getReplicaDistribution = (range: Range) => {
    const regions = new Set<string>();
    const zones = new Set<string>();
    
    range.replicas.forEach(nodeId => {
      const node = getNodeById(nodeId);
      if (node) {
        regions.add(node.region);
        zones.add(`${node.region}/${node.zone}`);
      }
    });
    
    return {
      regionCount: regions.size,
      zoneCount: zones.size,
      regions: Array.from(regions).join(', '),
    };
  };
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: 'white' }}>
      <h2 className="text-xl font-bold mb-4">Ranges</h2>
      
      <div className="space-y-3">
        {ranges.map(range => {
          const leaseholderNode = getLeaseholderNode(range);
          const isHot = range.load > 50;
          const distribution = getReplicaDistribution(range);
          
          return (
            <motion.div 
              key={range.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-md p-2 transition-colors duration-300"
              style={{ 
                borderColor: isHot ? '#fdba74' : '#e5e7eb',
                backgroundColor: isHot ? '#fff7ed' : 'white'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-sm flex items-center">
                    <span className="mr-1">Range {range.id}</span>
                    {isHot && (
                      <span className="px-1 text-[10px] rounded" style={{ backgroundColor: '#ffedd5', color: '#9a3412' }}>
                        HOT
                      </span>
                    )}
                  </h3>
                  <div className="text-xs" style={{ color: '#6b7280' }}>
                    {range.replicas.length} replicas across {distribution.regionCount} regions, {distribution.zoneCount} zones
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: isHot ? '#ea580c' : '#4b5563' }}>
                    {range.load} RPS
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onMarkRangeHot(range.id)}
                    className="text-white text-xs py-1 px-2 rounded"
                    style={{ backgroundColor: '#f97316' }}
                  >
                    Mark Hot
                  </motion.button>
                </div>
              </div>
              
              <div className="mt-1 text-xs flex flex-wrap items-center" style={{ color: '#4b5563' }}>
                <span className="font-medium mr-1">Leaseholder:</span>
                <div 
                  className="flex items-center"
                  style={{ backgroundColor: '#dbeafe', padding: '2px 4px', borderRadius: '4px' }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ 
                      backgroundColor: leaseholderNode?.status === 'online' ? '#22c55e' : '#ef4444'
                    }} 
                  />
                  <span style={{ color: '#1e40af' }}>
                    Node {range.leaseholder} {leaseholderNode && `(${leaseholderNode.region}/${leaseholderNode.zone})`}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

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
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: 'white' }}>
      <h2 className="text-xl font-bold mb-4">Ranges</h2>
      
      <div className="space-y-4">
        {ranges.map(range => {
          const leaseholderNode = getNodeById(range.leaseholder);
          const isHot = range.load > 50;
          
          return (
            <motion.div 
              key={range.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-md p-3 transition-colors duration-300"
              style={{ 
                borderColor: isHot ? '#fdba74' : '#e5e7eb',
                backgroundColor: isHot ? '#fff7ed' : 'white'
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Range {range.id}</h3>
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
              
              <h4 className="text-sm font-medium mb-1">Replicas:</h4>
              <div className="space-y-1">
                {range.replicas.map(nodeId => {
                  const node = getNodeById(nodeId);
                  const isLeaseholder = nodeId === range.leaseholder;
                  
                  return (
                    <div 
                      key={nodeId} 
                      className="text-sm flex items-center p-1 rounded"
                      style={isLeaseholder ? { backgroundColor: '#dbeafe', fontWeight: 600 } : {}}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ 
                          backgroundColor: node?.status === 'online' ? '#22c55e' : '#ef4444'
                        }} 
                      />
                      <span>
                        Node {nodeId} 
                        {isLeaseholder && <span className="ml-1" style={{ color: '#2563eb' }}>(Leaseholder)</span>}
                        {node && <span className="ml-1" style={{ color: '#6b7280' }}>{node.region}/{node.zone}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

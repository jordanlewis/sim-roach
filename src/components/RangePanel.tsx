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
    <div className="bg-white rounded-lg p-4 shadow-md w-full">
      <h2 className="text-xl font-bold mb-4">Ranges</h2>
      
      <div className="space-y-4">
        {ranges.map(range => {
          const leaseholderNode = getNodeById(range.leaseholder);
          
          return (
            <motion.div 
              key={range.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border ${range.load > 50 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'} 
                rounded-md p-3 transition-colors duration-300`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Range {range.id}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${range.load > 50 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {range.load} RPS
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onMarkRangeHot(range.id)}
                    className="bg-orange-500 text-white text-xs py-1 px-2 rounded hover:bg-orange-600"
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
                      className={`text-sm flex items-center p-1 rounded
                        ${isLeaseholder ? 'bg-blue-100 font-semibold' : ''}`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full mr-2 
                          ${node?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} 
                      />
                      <span>
                        Node {nodeId} 
                        {isLeaseholder && <span className="ml-1 text-blue-600">(Leaseholder)</span>}
                        {node && <span className="text-gray-500 ml-1">{node.region}/{node.zone}</span>}
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

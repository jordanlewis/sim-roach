import { motion } from 'framer-motion';
import { Node } from '../types';

interface ClusterMapProps {
  nodes: Node[];
  onNodeClick: (nodeId: string) => void;
}

export default function ClusterMap({ nodes, onNodeClick }: ClusterMapProps) {
  // Group nodes by region and zone
  const nodesByRegion = nodes.reduce<Record<string, Record<string, Node[]>>>((acc, node) => {
    if (!acc[node.region]) {
      acc[node.region] = {};
    }
    
    if (!acc[node.region][node.zone]) {
      acc[node.region][node.zone] = [];
    }
    
    acc[node.region][node.zone].push(node);
    return acc;
  }, {});
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: '#f3f4f6' }}>
      <h2 className="text-xl font-bold mb-4">Cluster Map</h2>
      
      <div className="flex flex-wrap gap-4">
        {Object.entries(nodesByRegion).map(([region, zones]) => (
          <div 
            key={region} 
            className="border rounded-md p-3 flex-1 min-w-[250px]" 
            style={{ borderColor: '#d1d5db' }}
          >
            <h3 className="text-lg font-semibold mb-2">Region: {region}</h3>
            
            <div className="space-y-3">
              {Object.entries(zones).map(([zone, zoneNodes]) => (
                <div key={zone} className="pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <h4 className="text-md font-medium mb-2">Zone: {zone}</h4>
                  
                  <div className="flex flex-wrap gap-2">
                    {zoneNodes.map(node => (
                      <motion.div
                        key={node.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNodeClick(node.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
                          text-white font-bold text-xs shadow-md"
                        style={{ 
                          backgroundColor: node.status === 'online' ? '#22c55e' : '#ef4444'
                        }}
                        title={`Node ${node.id} (${node.status})`}
                      >
                        {node.id.slice(0, 2)}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

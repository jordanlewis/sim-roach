import { motion } from 'framer-motion';
import { Node, Range } from '../types';
import { useState } from 'react';

interface ClusterMapProps {
  nodes: Node[];
  ranges: Range[];
  onNodeClick: (nodeId: string) => void;
}

export default function ClusterMap({ nodes, ranges, onNodeClick }: ClusterMapProps) {
  // State to track highlighted range
  const [highlightedRangeId, setHighlightedRangeId] = useState<string | null>(null);
  
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
  
  // Find the range object by ID
  const getRangeById = (rangeId: string) => {
    return ranges.find(r => r.id === rangeId);
  };
  
  // Handle mouse enter on range
  const handleRangeMouseEnter = (rangeId: string) => {
    setHighlightedRangeId(rangeId);
  };
  
  // Handle mouse leave on range
  const handleRangeMouseLeave = () => {
    setHighlightedRangeId(null);
  };
  
  // Check if a range replica should be highlighted
  const isHighlighted = (rangeId: string) => {
    return highlightedRangeId === rangeId;
  };
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: '#f3f4f6' }}>
      <h2 className="text-xl font-bold mb-4">Cluster Map</h2>
      
      <div className="w-full border border-gray-300 rounded-lg" style={{ minHeight: '500px' }}>
        <div className="grid" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          padding: '1rem'
        }}>
          {regions.map(region => {
            const regionNodes = nodes.filter(node => node.region === region);
            const zones = [...new Set(regionNodes.map(node => node.zone))];
            
            return (
              <div 
                key={region}
                className="border rounded-lg p-3"
                style={{ 
                  borderColor: '#d1d5db',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#1f2937' }}>
                  {region}
                </h3>
                
                <div className="flex flex-col space-y-4">
                  {zones.map(zone => {
                    const zoneNodes = regionNodes.filter(node => node.zone === zone);
                    
                    return (
                      <div key={zone} className="border-t pt-2" style={{ borderColor: '#e5e7eb' }}>
                        <div className="text-sm font-medium mb-2" style={{ color: '#4b5563' }}>
                          Zone: {zone}
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          {zoneNodes.map(node => {
                            const nodeRanges = getRangesForNode(node.id);
                            
                            return (
                              <motion.div
                                key={node.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onNodeClick(node.id)}
                                className="relative flex flex-wrap justify-center items-center cursor-pointer 
                                  shadow-md rounded-lg p-1"
                                style={{ 
                                  width: '80px',
                                  height: '80px',
                                  backgroundColor: node.status === 'online' ? 'white' : '#fecaca',
                                  border: `2px solid ${node.status === 'online' ? '#22c55e' : '#ef4444'}`
                                }}
                                title={`Node ${node.id} (${node.status})`}
                              >
                                <div className="absolute top-0 left-0 right-0 text-center text-xs font-bold py-0.5"
                                     style={{ backgroundColor: node.status === 'online' ? '#22c55e' : '#ef4444', color: 'white' }}>
                                  {node.id}
                                </div>
                                
                                <div className="flex flex-wrap justify-center gap-1 mt-5">
                                  {nodeRanges.map(range => {
                                    const isRangeHighlighted = isHighlighted(range.id);
                                    const isLeaseHolder = isLeaseholder(node.id, range.id);
                                    const rangeData = getRangeById(range.id);
                                    const isHot = rangeData && rangeData.load > 50;
                                    
                                    return (
                                      <motion.div 
                                        key={range.id}
                                        className="w-4 h-4 rounded-sm flex items-center justify-center relative"
                                        style={{ 
                                          backgroundColor: isLeaseHolder ? '#3b82f6' : '#9ca3af',
                                          border: isHot ? '1px solid #f97316' : 'none',
                                          transform: isRangeHighlighted ? 'scale(1.3)' : 'scale(1)',
                                          zIndex: isRangeHighlighted ? 10 : 1,
                                          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                          boxShadow: isRangeHighlighted ? '0 0 5px 2px rgba(59, 130, 246, 0.5)' : 'none'
                                        }}
                                        title={`Range ${range.id} ${isLeaseHolder ? '(Leaseholder)' : ''} - ${rangeData?.load} RPS`}
                                        onMouseEnter={() => handleRangeMouseEnter(range.id)}
                                        onMouseLeave={handleRangeMouseLeave}
                                        whileHover={{ scale: 1.3 }}
                                      >
                                        <span className="text-[7px] text-white font-bold">
                                          {range.id.replace('r', '')}
                                        </span>
                                        
                                        {/* Show connection lines when highlighted */}
                                        {isRangeHighlighted && (
                                          <div 
                                            className="absolute rounded-full" 
                                            style={{
                                              top: '50%',
                                              left: '50%',
                                              width: '8px',
                                              height: '8px',
                                              backgroundColor: 'rgba(59, 130, 246, 0.3)',
                                              boxShadow: '0 0 8px 4px rgba(59, 130, 246, 0.3)',
                                              transform: 'translate(-50%, -50%)',
                                              zIndex: -1
                                            }}
                                          />
                                        )}
                                      </motion.div>
                                    );
                                  })}
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
      
      {/* Information about highlighted range - always present with fixed height */}
      <div className="mt-2 text-center text-sm h-6" style={{ color: '#4b5563' }}>
        {highlightedRangeId ? (
          <>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Range {highlightedRangeId}</span> selected
            {' - '}
            <span>
              {getRangeById(highlightedRangeId)?.replicas.length} replicas 
              {getRangeById(highlightedRangeId)?.load > 50 ? ' (Hot Range)' : ''}
            </span>
          </>
        ) : (
          <span className="opacity-0">Placeholder for fixed height</span>
        )}
      </div>
    </div>
  );
}

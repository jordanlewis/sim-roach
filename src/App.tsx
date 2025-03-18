import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Node, Range } from './types';
import ClusterMap from './components/ClusterMap';
import RangePanel from './components/RangePanel';
import ControlPanel, { SimulatorConfig } from './components/ControlPanel';
import { SimulatorService, DEFAULT_CONFIG } from './services/simulatorService';

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [simulatorService] = useState(new SimulatorService(DEFAULT_CONFIG));
  const [nodes, setNodes] = useState<Node[]>([]);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_CONFIG);
  
  // Initialize simulator on start
  useEffect(() => {
    if (isStarted) {
      setNodes(simulatorService.getNodes());
      setRanges(simulatorService.getRanges());
      setConfig(simulatorService.getConfig());
    }
  }, [isStarted, simulatorService]);
  
  // Handle node status toggle
  const handleNodeClick = (nodeId: string) => {
    simulatorService.toggleNodeStatus(nodeId);
    setNodes([...simulatorService.getNodes()]);
    setRanges([...simulatorService.getRanges()]);
  };
  
  // Handle adding a new node
  const handleAddNode = () => {
    simulatorService.addNode();
    setNodes([...simulatorService.getNodes()]);
    setRanges([...simulatorService.getRanges()]);
  };
  
  // Handle adding a new range
  const handleAddRange = () => {
    try {
      simulatorService.addRange();
      setRanges([...simulatorService.getRanges()]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add range');
    }
  };
  
  // Handle marking range as hot
  const handleMarkRangeHot = (rangeId: string) => {
    simulatorService.markRangeHot(rangeId);
    setRanges([...simulatorService.getRanges()]);
  };
  
  // Handle configuration update
  const handleUpdateConfig = (newConfig: SimulatorConfig) => {
    const { nodes: updatedNodes, ranges: updatedRanges } = simulatorService.updateConfig(newConfig);
    setNodes(updatedNodes);
    setRanges(updatedRanges);
    setConfig(newConfig);
  };
  
  // Intro screen if not started
  if (!isStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl"
        >
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#2563eb' }}>
            CockroachDB Simulator
          </h1>
          <p className="text-xl mb-8">
            An interactive visualization of CockroachDB's resilience, 
            scalability, and locality features
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsStarted(true)}
            className="font-bold py-2 px-6 rounded-full shadow-lg"
            style={{ backgroundColor: '#16a34a', color: 'white' }}
          >
            Start Exploring
          </motion.button>
        </motion.div>
      </div>
    );
  }
  
  // Main simulator interface
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: '#f9fafb' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#2563eb' }}>CockroachDB Simulator</h1>
        <p style={{ color: '#4b5563' }}>Explore how CockroachDB handles node failures, hot ranges, and more</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 mb-4">
          <ControlPanel 
            onUpdateConfig={handleUpdateConfig}
            currentConfig={config} 
          />
        </div>
        
        <div className="md:col-span-2">
          <ClusterMap 
            nodes={nodes}
            ranges={ranges}
            onNodeClick={handleNodeClick} 
          />
        </div>
        
        <div className="md:col-span-1 space-y-6">
          <RangePanel 
            ranges={ranges} 
            nodes={nodes} 
            onMarkRangeHot={handleMarkRangeHot} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ControlPanelProps {
  onAddNode: () => void;
  onAddRange: () => void;
  onUpdateConfig: (config: SimulatorConfig) => void;
  currentConfig: SimulatorConfig;
}

export interface SimulatorConfig {
  regionCount: number;
  replicationFactor: number;
  nodeCount: number;
  rangeCount: number;
}

export default function ControlPanel({ 
  onAddNode, 
  onAddRange, 
  onUpdateConfig,
  currentConfig 
}: ControlPanelProps) {
  const [config, setConfig] = useState<SimulatorConfig>(currentConfig);
  
  const handleConfigChange = (key: keyof SimulatorConfig, value: number) => {
    // Set minimum values
    if (key === 'regionCount' && value < 1) value = 1;
    if (key === 'replicationFactor' && value < 1) value = 1;
    if (key === 'nodeCount' && value < 1) value = 1;
    if (key === 'rangeCount' && value < 1) value = 1;
    
    // Set maximum values
    if (key === 'regionCount' && value > 10) value = 10;
    if (key === 'replicationFactor' && value > 7) value = 7;
    if (key === 'nodeCount' && value > 30) value = 30;
    if (key === 'rangeCount' && value > 30) value = 30;
    
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };
  
  const handleApplyConfig = () => {
    onUpdateConfig(config);
  };
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: 'white' }}>
      <h2 className="text-xl font-bold mb-4">Simulator Parameters</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: '#4b5563' }}>
            Regions
          </label>
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              max="10"
              value={config.regionCount}
              onChange={(e) => handleConfigChange('regionCount', parseInt(e.target.value) || 1)}
              className="border rounded px-2 py-1 w-full"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: '#4b5563' }}>
            Replication Factor
          </label>
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              max="7"
              value={config.replicationFactor}
              onChange={(e) => handleConfigChange('replicationFactor', parseInt(e.target.value) || 1)}
              className="border rounded px-2 py-1 w-full"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: '#4b5563' }}>
            Nodes
          </label>
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              max="30"
              value={config.nodeCount}
              onChange={(e) => handleConfigChange('nodeCount', parseInt(e.target.value) || 1)}
              className="border rounded px-2 py-1 w-full"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: '#4b5563' }}>
            Ranges
          </label>
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              max="30"
              value={config.rangeCount}
              onChange={(e) => handleConfigChange('rangeCount', parseInt(e.target.value) || 1)}
              className="border rounded px-2 py-1 w-full"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleApplyConfig}
          className="text-white py-2 px-4 rounded"
          style={{ backgroundColor: '#059669' }}
        >
          Apply Configuration
        </motion.button>
        
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddNode}
            className="text-white py-2 px-4 rounded"
            style={{ backgroundColor: '#2563eb' }}
          >
            Add Node
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddRange}
            className="text-white py-2 px-4 rounded"
            style={{ backgroundColor: '#9333ea' }}
          >
            Add Range
          </motion.button>
        </div>
      </div>
    </div>
  );
}

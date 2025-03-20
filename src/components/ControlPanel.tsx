import { useState } from 'react';

interface ControlPanelProps {
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
  onUpdateConfig,
  currentConfig 
}: ControlPanelProps) {
  const [config, setConfig] = useState<SimulatorConfig>(currentConfig);
  
  // Only apply configuration when needed, not on every change
  const applyConfig = () => {
    onUpdateConfig(config);
  };
  
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
  
  // Handle Enter key press to apply changes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyConfig();
    }
  };
  
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: 'white' }}>
      <h2 className="text-xl font-bold mb-4">Simulator Parameters</h2>
      
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap" style={{ color: '#4b5563' }}>
            Regions:
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={config.regionCount}
            onChange={(e) => handleConfigChange('regionCount', parseInt(e.target.value) || 1)}
            onBlur={applyConfig}
            onKeyDown={handleKeyDown}
            className="border rounded px-2 py-1 w-16"
            style={{ borderColor: '#d1d5db' }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap" style={{ color: '#4b5563' }}>
            Replication Factor:
          </label>
          <input
            type="number"
            min="1"
            max="7"
            value={config.replicationFactor}
            onChange={(e) => handleConfigChange('replicationFactor', parseInt(e.target.value) || 1)}
            onBlur={applyConfig}
            onKeyDown={handleKeyDown}
            className="border rounded px-2 py-1 w-16" 
            style={{ borderColor: '#d1d5db' }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap" style={{ color: '#4b5563' }}>
            Nodes:
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.nodeCount}
            onChange={(e) => handleConfigChange('nodeCount', parseInt(e.target.value) || 1)}
            onBlur={applyConfig}
            onKeyDown={handleKeyDown}
            className="border rounded px-2 py-1 w-16"
            style={{ borderColor: '#d1d5db' }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap" style={{ color: '#4b5563' }}>
            Ranges:
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.rangeCount}
            onChange={(e) => handleConfigChange('rangeCount', parseInt(e.target.value) || 1)}
            onBlur={applyConfig}
            onKeyDown={handleKeyDown}
            className="border rounded px-2 py-1 w-16"
            style={{ borderColor: '#d1d5db' }}
          />
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs" style={{ color: '#6b7280' }}>
          Press Enter or click Apply to update the simulator. Click on nodes to toggle their status.
        </div>
        <button
          onClick={applyConfig}
          className="text-white py-1 px-3 rounded text-sm"
          style={{ backgroundColor: '#059669' }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

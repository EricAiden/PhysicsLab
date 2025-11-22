
import React, { useState, useEffect, useRef } from 'react';
import { CircuitComponent, Wire, ComponentType } from './types';
import CircuitCanvas from './components/CircuitCanvas';
import SchematicCanvas from './components/SchematicCanvas';
import ComponentPalette from './components/ComponentPalette';
import ChatAssistant from './components/ChatAssistant';
import TaskPanel from './components/TaskPanel';
import { Zap, RotateCcw, Eye, PenTool, Camera, Upload, Loader2 } from 'lucide-react';
import { solveCircuit } from './utils/solver';
import { scanCircuitImage } from './services/geminiService';
import { convertLayoutToState } from './utils/layoutEngine';

const App: React.FC = () => {
  // Initial State
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'PHYSICAL' | 'SCHEMATIC'>('PHYSICAL');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // For generating IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Simulation Loop
  useEffect(() => {
    const result = solveCircuit(components, wires);
    
    if (result.error !== error) {
        setError(result.error);
    }

    if (!result.error) {
        const newComps = result.components;
        const changed = newComps.some((nc) => {
            const oc = components.find(c => c.id === nc.id);
            if (!oc) return true;
            return Math.abs((oc.current || 0) - (nc.current || 0)) > 0.001 || 
                   Math.abs((oc.voltageDrop || 0) - (nc.voltageDrop || 0)) > 0.001;
        });
        
        if (changed) {
             setComponents(prev => prev.map(p => {
                 const calculated = newComps.find(n => n.id === p.id);
                 return calculated ? { ...p, current: calculated.current, voltageDrop: calculated.voltageDrop } : p;
             }));
        }
    } else {
        setComponents(prev => {
            const needsZero = prev.some(p => (p.current || 0) !== 0 || (p.voltageDrop || 0) !== 0);
            if(needsZero) return prev.map(p => ({...p, current: 0, voltageDrop: 0}));
            return prev;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wires.length, components.map(c => `${c.id}-${c.value}-${c.isOpen}-${c.x}-${c.y}`).join('|')]);

  const handleAddComponent = (type: ComponentType) => {
    const id = generateId();
    const labels = components.filter(c => c.type === type).length + 1;
    const newComp: CircuitComponent = {
      id,
      type,
      x: 200 + Math.random() * 50,
      y: 200 + Math.random() * 50,
      rotation: 0,
      value: type === 'BATTERY' ? 12 : (type === 'RESISTOR' || type === 'RHEOSTAT' ? 10 : 0),
      label: `${type === 'BATTERY' ? 'U' : (type === 'RESISTOR' ? 'R' : (type === 'BULB' ? 'L' : ''))}${labels}`,
      isOpen: type === 'SWITCH' ? true : undefined
    };
    setComponents(prev => [...prev, newComp]);
  };

  const handleMoveComponent = (id: string, x: number, y: number) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
  };

  const handleUpdateComponent = (id: string, updates: Partial<CircuitComponent>) => {
      setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setWires(prev => prev.filter(w => w.sourceComponentId !== id && w.targetComponentId !== id));
  };

  const handleConnect = (sId: string, sPin: number, tId: string, tPin: number) => {
    if (sId === tId) return;
    const exists = wires.some(w => 
        (w.sourceComponentId === sId && w.sourcePinIndex === sPin && w.targetComponentId === tId && w.targetPinIndex === tPin) ||
        (w.sourceComponentId === tId && w.sourcePinIndex === tPin && w.targetComponentId === sId && w.targetPinIndex === sPin)
    );
    if (exists) return;

    setWires(prev => [...prev, {
        id: generateId(),
        sourceComponentId: sId,
        sourcePinIndex: sPin,
        targetComponentId: tId,
        targetPinIndex: tPin
    }]);
  };

  const handleReset = () => {
      if(confirm("确定要清空画布吗？")) {
          setComponents([]);
          setWires([]);
          setError(undefined);
      }
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
                const result = await scanCircuitImage(base64String);
                const { components: newComps, wires: newWires } = convertLayoutToState(result);
                
                if(newComps.length > 0) {
                    setComponents(newComps);
                    setWires(newWires);
                    setError(undefined);
                    alert("识别成功！电路已生成。请检查连线是否正确。");
                } else {
                    alert("未能识别出有效的电路元件。");
                }
            } catch (err) {
                alert("识别失败，请重试。");
            } finally {
                setIsScanning(false);
            }
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error(error);
        setIsScanning(false);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 text-gray-800 overflow-hidden font-sans relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-400" />
            <h3 className="text-xl font-bold">正在分析电路图...</h3>
            <p className="text-sm text-gray-300 mt-2">AI 正在识别元件与连接关系</p>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 h-16 shrink-0 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-2 rounded-lg shadow-lg shadow-indigo-200">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
              <h1 className="font-bold text-lg text-gray-900 tracking-tight leading-tight">PhysicsLab</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Interactive Circuit Simulator</p>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button 
                onClick={() => setViewMode('PHYSICAL')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'PHYSICAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <PenTool className="w-4 h-4" />
                实物连接
            </button>
            <button 
                onClick={() => setViewMode('SCHEMATIC')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'SCHEMATIC' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Eye className="w-4 h-4" />
                电路图
            </button>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={handleScanClick}
                className="flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg shadow-sm shadow-indigo-200"
            >
                <Camera className="w-4 h-4" />
                <span>拍照/上传</span>
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1" />
            <button onClick={handleReset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50">
                <RotateCcw className="w-4 h-4" />
                <span>重置</span>
            </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Component Palette */}
        <div className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col z-10">
            <div className="p-4 border-b border-gray-200 bg-white/50 backdrop-blur">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Toolbox</h2>
                <p className="text-xs text-gray-400">Drag or click to add</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <ComponentPalette onAdd={handleAddComponent} />
            </div>
        </div>

        {/* Center: Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-200 relative overflow-hidden">
            {/* Tab Content */}
            <div className="flex-1 m-3 rounded-xl shadow-inner overflow-hidden bg-white relative border border-gray-300">
                 {viewMode === 'PHYSICAL' ? (
                     <CircuitCanvas 
                        components={components} 
                        wires={wires}
                        onMoveComponent={handleMoveComponent}
                        onConnect={handleConnect}
                        onDeleteComponent={handleDeleteComponent}
                        onUpdateComponent={handleUpdateComponent}
                        error={error}
                     />
                 ) : (
                     <SchematicCanvas 
                        components={components}
                        wires={wires}
                     />
                 )}
            </div>
        </div>

        {/* Right: Sidebar (Chat + Task) */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
            {/* Top Half: AI Chat */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-gray-200">
                <ChatAssistant circuitContext={{ components, wires, error }} />
            </div>
            
            {/* Bottom Half: Task Guide */}
            <div className="h-[40%] flex flex-col min-h-[200px]">
                 <TaskPanel components={components} wires={wires} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;

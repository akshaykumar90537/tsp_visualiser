import { useState, useEffect, useMemo } from 'react'
import { Map, Settings, Play, Pause, StepForward, BarChart2, Layers, Globe, Search, Plus, Trash2, X, Activity, Clock, Zap, Cpu, Verified, AlertTriangle, ShieldCheck } from 'lucide-react'
import { City, TraceEvent, buildDistanceMatrix, generateRandomCities } from './types'
import { nearestNeighbor } from './algorithms/greedy'
import { dynamicProgramming } from './algorithms/dp'
import { branchAndBound } from './algorithms/branchBound'
import { GraphCanvas } from './components/GraphCanvas'
import { MapCanvas } from './components/MapCanvas'

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface ComparisonResult {
  algoId: string;
  name: string;
  distance: number | string;
  timeMs: number | string;
  isExact: boolean;
}

function App() {
  const [cities, setCities] = useState<City[]>([
    { id: 0, x: 200, y: 150, lat: 28.6139, lng: 77.2090, name: "New Delhi" },
    { id: 1, x: 400, y: 450, lat: 19.0760, lng: 72.8777, name: "Mumbai" },
    { id: 2, x: 190, y: 350, lat: 26.9124, lng: 75.7873, name: "Jaipur" }
  ])
  const [algorithm, setAlgorithm] = useState<'greedy' | 'dp' | 'bb'>('bb')
  const [speedMs, setSpeedMs] = useState(100)
  const [viewMode, setViewMode] = useState<'2d' | 'map'>('map')
  const [numCities, setNumCities] = useState(12)

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Animation State
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Analytics State
  const [executionTime, setExecutionTime] = useState<number>(0)
  const [optimalDistance, setOptimalDistance] = useState<number | null>(null)
  
  // Comparison Modal State
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonData, setComparisonData] = useState<ComparisonResult[]>([])
  const [isScanning, setIsScanning] = useState(false)

  // Nominatim Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
          const data = await res.json();
          setSearchResults(data);
        } catch (e) {
          console.error(e);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery])

  const matrix = useMemo(() => buildDistanceMatrix(cities), [cities])

  const handleAddCity = (res: NominatimResult) => {
    if (cities.length >= 15) {
      alert("Maximum 15 cities allowed simultaneously to prevent browser lockup for exact algorithms.");
      return;
    }
    const nameStr = res.display_name.split(',')[0];
    
    // Check duplication
    if (cities.some(c => c.name === nameStr || (Math.abs(c.lat - parseFloat(res.lat)) < 0.001))) {
       setSearchQuery('');
       setSearchResults([]);
       return;
    }

    setCities(prev => [...prev, {
      id: prev.length,
      x: 40 + Math.random() * (CANVAS_WIDTH - 80),
      y: 40 + Math.random() * (CANVAS_HEIGHT - 80),
      lat: parseFloat(res.lat),
      lng: parseFloat(res.lon),
      name: nameStr
    }]);
    setSearchQuery('');
    setSearchResults([]);
    setIsPlaying(false);
    setTrace([]); // Invalidate current trace
  }

  const removeCity = (indexToRemove: number) => {
    setCities(prev => {
      const newCities = prev.filter((_, i) => i !== indexToRemove).map((c, idx) => ({ ...c, id: idx })); // Re-id
      return newCities;
    });
    setTrace([]);
  }

  const clearAllCities = () => {
    setCities([]);
    setTrace([]);
    setIsPlaying(false);
  }

  const runAlgorithm = () => {
    if (cities.length <= 1) return;
    setIsPlaying(false);
    setStepIndex(0);
    
    if (algorithm === 'dp' && cities.length > 12) {
      alert("Dynamic Programming is very slow for large N. Consider using Nearest Neighbor instead.");
    }

    let gen: Generator<TraceEvent>;
    if (algorithm === 'greedy') gen = nearestNeighbor({ cities, matrix }, 0);
    else if (algorithm === 'dp') gen = dynamicProgramming({ cities, matrix }, 0);
    else gen = branchAndBound({ cities, matrix }, 0);

    const newTrace: TraceEvent[] = [];
    let count = 0;
    
    // Measure time
    const tStart = performance.now();
    while(true) {
        let res = gen.next();
        if (res.done) break;
        newTrace.push(res.value);
        count++;
        if (count > 250000) break; // Arbitrary safety limit
    }
    const tEnd = performance.now();
    setExecutionTime(tEnd - tStart);
    setTrace(newTrace);
    setStepIndex(viewMode === 'map' ? (newTrace.length > 0 ? newTrace.length - 1 : 0) : 0);

    // Calculate background optimal if using heuristic
    if (algorithm === 'greedy' && cities.length <= 13) {
       const exactGen = branchAndBound({ cities, matrix }, 0);
       let bestOpt = Infinity;
       let exactCount = 0;
       while(true) {
          let res = exactGen.next();
          if (res.done) break;
          if (res.value.bestCost !== undefined && res.value.bestCost < bestOpt) {
             bestOpt = res.value.bestCost;
          }
          exactCount++;
          if (exactCount > 250000) break;
       }
       setOptimalDistance(bestOpt === Infinity ? null : bestOpt);
    } else {
       setOptimalDistance(null);
    }
  }

  const runCompareAll = () => {
     if (cities.length <= 1) return;
     setIsScanning(true);
     setShowComparison(true);
     setComparisonData([]);

     // Schedule on next tick to allow UI to render spinner
     setTimeout(() => {
        const results: ComparisonResult[] = [];
        const algos = [
          { id: 'greedy', name: 'Nearest Neighbor', exact: false },
          { id: 'bb', name: 'Branch & Bound', exact: true },
          { id: 'dp', name: 'Held-Karp DP', exact: true }
        ];

        for (const a of algos) {
           if (a.id === 'dp' && cities.length > 13) {
              results.push({ algoId: a.id, name: a.name, distance: 'Skipped (>13)', timeMs: '-', isExact: a.exact });
              continue;
           }
           let gen: Generator<TraceEvent>;
           if (a.id === 'greedy') gen = nearestNeighbor({ cities, matrix }, 0);
           else if (a.id === 'dp') gen = dynamicProgramming({ cities, matrix }, 0);
           else gen = branchAndBound({ cities, matrix }, 0);

           let best = Infinity;
           const ts = performance.now();
           let c = 0;
           while(true) {
              let res = gen.next();
              if (res.done) break;
              if (res.value.bestCost !== undefined && res.value.bestCost < best) best = res.value.bestCost;
              c++;
              if (c > 250000) break;
           }
           const te = performance.now();
           results.push({ algoId: a.id, name: a.name, distance: best === Infinity ? 'Error' : best, timeMs: (te - ts), isExact: a.exact });
        }
        setComparisonData(results);
        setIsScanning(false);
     }, 100);
  }

  // Initial Run on mount
  useEffect(() => {
    if (trace.length === 0 && cities.length > 1) {
       runAlgorithm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Playback Loop
  useEffect(() => {
    let timer: number;
    if (isPlaying && stepIndex < trace.length - 1) {
      timer = window.setTimeout(() => {
        setStepIndex(prev => prev + 1);
      }, speedMs);
    } else if (stepIndex >= trace.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, trace, speedMs])

  const handleStep = () => {
    setIsPlaying(false);
    if (stepIndex < trace.length - 1) setStepIndex(stepIndex + 1);
  }

  const currentEvent = trace.length > 0 ? trace[stepIndex] : null;

  // Derive Panel Data
  const isExactAlg = algorithm !== 'greedy';
  const currCost = (trace.length > 0 && trace[trace.length - 1].bestCost !== Infinity) ? trace[trace.length - 1].bestCost! : 0;
  let gapStr = "0%";
  let gapAlert = false;
  if (!isExactAlg && optimalDistance && optimalDistance > 0 && currCost > 0) {
     const gap = ((currCost - optimalDistance) / optimalDistance) * 100;
     gapStr = `+${gap.toFixed(1)}%`;
     if (gap > 0.1) gapAlert = true;
  } else if (!isExactAlg) {
     gapStr = "Unknown";
  }

  const getAlgoComplexity = () => {
    if (algorithm === 'greedy') return "O(n²)";
    if (algorithm === 'dp') return "O(n² 2ⁿ)";
    return "O(n!) * Pruning"; // Branch and Bound
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-50 overflow-hidden font-sans">
      {/* Top Section */}
      <div className="flex bg-slate-800 border-b border-slate-700 p-4 items-center justify-between shadow-md z-20 shrink-0">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
           <Globe size={24} className="text-blue-400" /> Route Planner
        </h1>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm">
          <button 
            onClick={() => { setViewMode('2d'); setStepIndex(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${viewMode === '2d' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <Layers size={18} /> 📊 2D Visualization
          </button>
          <button 
            onClick={() => { setViewMode('map'); setStepIndex(trace.length > 0 ? trace.length - 1 : 0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${viewMode === 'map' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <Globe size={18} /> 🌍 Map Visualization
          </button>
        </div>
        
        <button 
          onClick={runCompareAll}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-lg text-sm font-bold transition-all"
        >
          <Activity size={16} /> Compare All Algorithms
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR PANEL */}
        <div className="w-[420px] flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-10">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {viewMode === 'map' ? (
              <>
                {/* Search Bar Section */}
                <section className="relative z-50">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <Search size={16} /> Add Location
                  </h2>
                  <div className="relative">
                    <input 
                       type="text" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Search for a city (e.g. Mumbai)"
                       className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    {isSearching && (
                       <div className="absolute right-3 top-3.5">
                          <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                       </div>
                    )}
                  </div>
                  
                  {/* Dropdown Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[100]">
                       {searchResults.map((res, idx) => (
                         <button 
                           key={idx}
                           onClick={() => handleAddCity(res)}
                           className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 text-sm flex items-center justify-between"
                         >
                            <span className="truncate flex-1 pr-2">{res.display_name}</span>
                            <Plus size={16} className="text-emerald-400 shrink-0" />
                         </button>
                       ))}
                    </div>
                  )}
                </section>

                {/* City Management List */}
                <section className="z-10 relative">
                  <div className="flex items-center justify-between mb-3">
                     <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        📍 Itinerary ({cities.length}/15)
                     </h2>
                     {cities.length > 0 && (
                        <button onClick={clearAllCities} className="text-xs text-red-400 hover:text-red-300 font-medium">Clear All</button>
                     )}
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden max-h-[170px] overflow-y-auto">
                     {cities.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">No cities added. Search above!</div>
                     ) : (
                        <div className="divide-y divide-slate-800">
                          {cities.map((city, idx) => (
                             <div key={city.id} className="p-3 flex items-center justify-between group hover:bg-slate-800/80 transition-colors">
                                <div className="flex items-center gap-3 w-full">
                                   <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                                      {idx + 1}
                                   </div>
                                   <div className="min-w-0 pr-2">
                                      <p className="text-sm font-medium truncate">{city.name || `City ${city.id}`}</p>
                                      <p className="text-[10px] text-slate-500 font-mono">{city.lat.toFixed(2)}, {city.lng.toFixed(2)}</p>
                                   </div>
                                </div>
                                <button onClick={() => removeCity(idx)} className="text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0">
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          ))}
                        </div>
                     )}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <BarChart2 size={16} /> Routing Algorithm
                  </h2>
                  <div className="space-y-2">
                    {[
                      {id: 'bb', label: 'Branch & Bound (Exact)'}, 
                      {id: 'dp', label: 'Held-Karp DP (Exact)'}, 
                      {id: 'greedy', label: 'Nearest Neighbor (Fast)'}
                    ].map((algo) => (
                      <label key={algo.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${algorithm === algo.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'}`}>
                        <input 
                          type="radio" name="algorithm" checked={algorithm === algo.id}
                          onChange={() => setAlgorithm(algo.id as any)} className="hidden" 
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${algorithm === algo.id ? 'border-blue-500' : 'border-slate-500'}`}>
                          {algorithm === algo.id && <div className="w-2 h-2 bg-blue-500 rounded-full"/>}
                        </div>
                        <span className="text-sm font-medium">{algo.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-blue-400 flex items-center gap-2 mb-2">
                    <Map size={24} /> TSP Visualizer
                  </h1>
                  <p className="text-slate-400 text-sm">
                    Solve and animate the Traveling Salesperson Problem interactively.
                  </p>
                </div>

                <section>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-slate-300">Number of Cities (Max 15)</label>
                    <span className="text-blue-400 font-bold">{numCities}</span>
                  </div>
                  <input 
                    type="range" min="3" max="15" 
                    value={numCities} 
                    onChange={(e) => {
                       const val = parseInt(e.target.value);
                       setNumCities(val);
                       setCities(generateRandomCities(val, CANVAS_WIDTH, CANVAS_HEIGHT));
                       setTrace([]);
                       setIsPlaying(false);
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </section>

                <section>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-slate-300">Animation Speed</label>
                  </div>
                  <input 
                    type="range" min="10" max="1000" step="10"
                    value={1010 - speedMs} 
                    onChange={(e) => setSpeedMs(1010 - parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </section>

                <button 
                   onClick={() => {
                     setCities(generateRandomCities(numCities, CANVAS_WIDTH, CANVAS_HEIGHT));
                     setTrace([]);
                     setIsPlaying(false);
                   }} 
                   className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                >
                   <Settings size={16} /> Randomize
                </button>
                
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <BarChart2 size={16} /> ALGORITHMS
                  </h2>
                  <div className="space-y-2">
                    {[
                      {id: 'bb', label: 'Branch & Bound'}, 
                      {id: 'dp', label: 'Dynamic Programming'}, 
                      {id: 'greedy', label: 'Nearest Neighbor'}
                    ].map((algo) => (
                      <label key={algo.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${algorithm === algo.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'}`}>
                        <input 
                          type="radio" name="algorithm" checked={algorithm === algo.id}
                          onChange={() => setAlgorithm(algo.id as any)} className="hidden" 
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${algorithm === algo.id ? 'border-blue-500' : 'border-slate-500'}`}>
                          {algorithm === algo.id && <div className="w-2 h-2 bg-blue-500 rounded-full"/>}
                        </div>
                        <span className="text-sm font-medium">{algo.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </>
            )}

          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800/80">
            {viewMode === 'map' ? (
              <button 
                 onClick={runAlgorithm}
                 disabled={cities.length < 2 || isPlaying}
                 className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:shadow-none transition-all flex justify-center items-center gap-2"
              >
                 <Play size={20} /> Compute Optimized Route
              </button>
            ) : (
               (!isPlaying && trace.length === 0) ? (
                 <button 
                   onClick={runAlgorithm}
                   disabled={cities.length < 2}
                   className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:shadow-none transition-all flex justify-center items-center gap-2"
                 >
                   <Play size={20} /> Run TSP Algorithm
                 </button>
               ) : (
                 <>
                   <div className="flex justify-between items-center gap-2 mb-4">
                       <button 
                         onClick={() => {
                           if(stepIndex >= trace.length - 1) setStepIndex(0);
                           setIsPlaying(!isPlaying);
                         }} 
                         className={`flex-1 flex justify-center items-center gap-2 text-white py-3 rounded-lg font-bold transition-all shadow-md select-none ${isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                       >
                         {isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play</>}
                       </button>
                       <button 
                         onClick={handleStep}
                         disabled={isPlaying || stepIndex >= trace.length - 1}
                         className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-slate-300"
                       >
                         <StepForward size={20} />
                       </button>
                   </div>
                   
                   <div className="w-full bg-slate-900 border border-slate-700 h-2 rounded-full overflow-hidden mb-2">
                     <div 
                       className="bg-blue-500 h-full transition-all duration-300"
                       style={{ width: `${(stepIndex / (trace.length > 1 ? trace.length - 1 : 1)) * 100}%` }}
                     />
                   </div>
                   <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-mono mb-2">
                       <span>Step {stepIndex}</span>
                       <span>{trace.length > 0 ? trace.length - 1 : 0}</span>
                   </div>
                   <div className="text-xs text-slate-400 font-mono h-4 overflow-hidden text-ellipsis whitespace-nowrap">
                      {currentEvent?.pruneReason || (currentEvent?.type === 'UPDATE_BEST' ? `New Best: ${currentEvent.bestCost?.toFixed(2)}` : 'Evaluating node...')}
                   </div>
                 </>
               )
            )}
          </div>
        </div>

        {/* MAIN VISUALIZATION PANEL */}
        <div className="flex-1 relative flex flex-col bg-slate-900 overflow-hidden items-center justify-center p-6">
          <div className="w-full h-full relative border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden bg-slate-800/20 flex justify-center items-center z-0">
               {viewMode === '2d' ? (
                 <GraphCanvas 
                   cities={cities} 
                   currentEvent={currentEvent} 
                   bestPath={currentEvent?.bestPath ?? null}
                   width={CANVAS_WIDTH} height={CANVAS_HEIGHT} 
                 />
               ) : (
                 <MapCanvas 
                   cities={cities}
                   currentEvent={currentEvent}
                   bestPath={trace.length > 0 ? trace[trace.length - 1].bestPath ?? null : null}
                 />
               )}
          </div>
          
          {/* ANALYTICS DASHBOARD PANELS */}
          {(trace.length > 0) && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 p-4 rounded-2xl shadow-2xl flex justify-around select-none min-w-[850px] z-30 gap-4">
                
                {/* Distance Card */}
                <div className="flex-1 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute -right-2 -top-2 opacity-10"><Zap size={64} /></div>
                   <p className="text-slate-400 text-[11px] uppercase font-bold tracking-widest mb-1 z-10">Route Length</p>
                   <p className="text-3xl font-mono text-emerald-400 font-bold drop-shadow-[0_0_10px_currentColor] z-10">
                     {currCost ? currCost.toFixed(0) : '---'} <span className="text-sm font-sans text-emerald-600">km</span>
                   </p>
                </div>

                {/* Optimality Card */}
                <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden ${isExactAlg ? 'bg-emerald-900/20 border-emerald-700/30' : (gapAlert ? 'bg-red-900/20 border-red-700/30' : 'bg-amber-900/20 border-amber-700/30')}`}>
                   <div className="absolute -right-2 -top-2 opacity-10">
                      {isExactAlg ? <ShieldCheck size={64} /> : <AlertTriangle size={64} />}
                   </div>
                   <p className="text-slate-400 text-[11px] uppercase font-bold tracking-widest mb-1 z-10">Optimality</p>
                   <p className={`text-xl font-bold z-10 ${isExactAlg ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isExactAlg ? 'Exact (Optimal)' : 'Approximate'}
                   </p>
                   {!isExactAlg && (
                      <p className={`text-[10px] mt-1 font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ${gapAlert ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        Gap: {gapStr}
                      </p>
                   )}
                </div>

                {/* Performance Card */}
                <div className="flex-1 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute -right-2 -top-2 opacity-10"><Clock size={64} /></div>
                   <p className="text-slate-400 text-[11px] uppercase font-bold tracking-widest mb-1 z-10">Execution Time</p>
                   <p className="text-2xl font-mono text-blue-400 font-bold z-10">
                     {executionTime < 1 ? '<1' : executionTime.toFixed(0)} <span className="text-xs font-sans text-blue-600">ms</span>
                   </p>
                   <p className="text-[10px] text-slate-500 mt-1 uppercase">Space: {trace.length-1} states</p>
                </div>
                
                {/* Complexity Card */}
                <div className="flex-1 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute -right-2 -top-2 opacity-10"><Cpu size={64} /></div>
                   <p className="text-slate-400 text-[11px] uppercase font-bold tracking-widest mb-1 z-10">Time Complexity</p>
                   <p className="text-xl font-mono text-violet-400 font-bold z-10">
                     {getAlgoComplexity()}
                   </p>
                   <p className="text-[10px] text-slate-500 mt-1 uppercase">{isExactAlg ? 'Exhaustive' : 'Heuristic'}</p>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* COMPARISON MODAL */}
      {showComparison && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-center items-center">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-3xl w-full">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="text-indigo-400" /> Comparison Analysis ({cities.length} Cities)
                  </h2>
                  <button onClick={() => setShowComparison(false)} className="text-slate-400 hover:text-white transition-colors">
                     <X size={24} />
                  </button>
               </div>
               
               {isScanning ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                     <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                     <p className="text-slate-400 animate-pulse">Running all algorithms concurrently...</p>
                  </div>
               ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                     <table className="w-full text-left">
                        <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                           <tr>
                              <th className="px-6 py-4 font-medium">Algorithm</th>
                              <th className="px-6 py-4 font-medium">Type</th>
                              <th className="px-6 py-4 font-medium">Time (ms)</th>
                              <th className="px-6 py-4 font-medium">Shortest Distance</th>
                              <th className="px-6 py-4 font-medium">Optimal?</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                           {comparisonData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                 <td className="px-6 py-4 text-slate-200 font-medium">{row.name}</td>
                                 <td className="px-6 py-4">
                                    <span className={`text-[10px] uppercase px-2 py-1 rounded-full border ${row.isExact ? 'border-emerald-700/50 bg-emerald-900/30 text-emerald-400' : 'border-amber-700/50 bg-amber-900/30 text-amber-400'}`}>
                                       {row.isExact ? 'Exact' : 'Heuristic'}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 font-mono text-blue-400">
                                    {typeof row.timeMs === 'number' ? (row.timeMs < 1 ? '<1' : row.timeMs.toFixed(1)) : row.timeMs}
                                 </td>
                                 <td className="px-6 py-4 font-mono text-emerald-400">
                                    {typeof row.distance === 'number' ? row.distance.toFixed(1) + ' km' : row.distance}
                                 </td>
                                 <td className="px-6 py-4">
                                    {row.isExact ? <Verified size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-amber-500" />}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         </div>
      )}

    </div>
  )
}

export default App

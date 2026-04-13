import { useState, useEffect, useMemo, useCallback } from 'react'
import { Map, Settings, Play, Pause, StepForward, BarChart2, RefreshCw } from 'lucide-react'
import { City, TraceEvent, generateRandomCities, buildDistanceMatrix } from './types'
import { nearestNeighbor } from './algorithms/greedy'
import { dynamicProgramming } from './algorithms/dp'
import { branchAndBound } from './algorithms/branchBound'
import { GraphCanvas } from './components/GraphCanvas'

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function App() {
  const [numCities, setNumCities] = useState(6)
  const [cities, setCities] = useState<City[]>([])
  const [algorithm, setAlgorithm] = useState<'greedy' | 'dp' | 'bb'>('bb')
  const [speedMs, setSpeedMs] = useState(100)

  // Animation State
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Create cities on mount or randomize
  const initCities = useCallback(() => {
    setIsPlaying(false)
    setCities(generateRandomCities(numCities, CANVAS_WIDTH, CANVAS_HEIGHT))
  }, [numCities])

  useEffect(() => {
    initCities()
  }, [initCities])

  const matrix = useMemo(() => buildDistanceMatrix(cities), [cities])

  // Generate algorithm trace whenever cities or algorithm changes
  useEffect(() => {
    if (cities.length <= 1) return;
    setIsPlaying(false)
    setStepIndex(0)
    
    // Quick safeguard so UI doesnt lock up if someone pumps slider to 15 on DP
    if (algorithm === 'dp' && numCities > 12) {
      alert("Dynamic Programming is O(N^2 2^N). Please keep cities <= 12 for DP.");
      setNumCities(12);
      return;
    }

    const start = performance.now();
    let gen: Generator<TraceEvent>;
    if (algorithm === 'greedy') gen = nearestNeighbor({ cities, matrix }, 0);
    else if (algorithm === 'dp') gen = dynamicProgramming({ cities, matrix }, 0);
    else gen = branchAndBound({ cities, matrix }, 0);

    const newTrace: TraceEvent[] = [];
    // We only collect up to 10000 events to prevent massive memory usage on huge B&B trees
    let count = 0;
    while(true) {
        let res = gen.next();
        if (res.done) break;
        newTrace.push(res.value);
        count++;
        if (count > 25000) {
            console.warn("Trace truncated at 25000 events.");
            break;
        }
    }
    const end = performance.now();
    console.log(`Generated ${newTrace.length} events in ${end - start}ms`);
    
    setTrace(newTrace);
    setStepIndex(0);
  }, [cities, matrix, algorithm])

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
  const isDone = currentEvent?.type === 'DONE';

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-50 overflow-hidden font-sans">
      <div className="w-96 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
            <Map className="text-blue-400" /> TSP Visualizer
          </h1>
          <p className="text-sm text-slate-400 mt-2">Solve and animate the Traveling Salesperson Problem interactively.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Settings size={16} /> Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Number of Cities (Max 15)</label>
                  <span className="text-sm font-bold text-blue-400">{numCities}</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="15" 
                  value={numCities}
                  onChange={(e) => setNumCities(Number(e.target.value))}
                  className="w-full transition-all accent-blue-500" 
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Animation Speed</label>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="10"
                  value={1000 - speedMs}
                  onChange={(e) => setSpeedMs(1000 - Number(e.target.value))}
                  className="w-full transition-all accent-blue-500" 
                  style={{ direction: 'rtl' }} // Invert range direction visually
                />
              </div>
              <div className="flex gap-2">
                <button onClick={initCities} className="flex-1 flex justify-center items-center gap-2 bg-slate-700 hover:bg-slate-600 transition-colors py-2 rounded-lg font-medium text-sm">
                   <RefreshCw size={16}/> Randomize
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <BarChart2 size={16} /> Algorithms
            </h2>
            <div className="space-y-2">
              {[
                {id: 'bb', label: 'Branch & Bound'}, 
                {id: 'dp', label: 'Dynamic Programming'}, 
                {id: 'greedy', label: 'Nearest Neighbor'}
              ].map((algo) => (
                <label key={algo.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${algorithm === algo.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                  <input 
                    type="radio" 
                    name="algorithm" 
                    checked={algorithm === algo.id}
                    onChange={() => setAlgorithm(algo.id as any)} 
                    className="hidden" 
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${algorithm === algo.id ? 'border-blue-500' : 'border-slate-500'}`}>
                    {algorithm === algo.id && <div className="w-2 h-2 bg-blue-500 rounded-full"/>}
                  </div>
                  <span className="text-sm font-medium">{algo.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
           <div className="mb-4">
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${trace.length ? (stepIndex / (trace.length - 1)) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                  <span>Step {stepIndex}</span>
                  <span>{trace.length ? trace.length - 1 : 0}</span>
              </div>
              {currentEvent?.pruneReason && (
                 <p className="text-xs mt-2 text-slate-400 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                   {isDone ? 'Finished exploring.' : currentEvent.pruneReason}
                 </p>
              )}
           </div>

           <div className="flex justify-between items-center gap-2">
               <button 
                 onClick={() => {
                   if(isDone) setStepIndex(0);
                   setIsPlaying(!isPlaying);
                 }} 
                 className={`flex-1 flex justify-center items-center gap-2 text-white py-3 rounded-xl font-bold transition-all shadow-lg select-none ${isPlaying ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'}`}
               >
                 {isPlaying ? <><Pause size={20} /> Pause</> : <><Play size={20} /> {isDone ? 'Replay' : 'Start'}</>}
               </button>
               <button 
                 onClick={handleStep}
                 disabled={isPlaying || isDone}
                 className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors text-slate-300"
               >
                 <StepForward size={20} />
               </button>
           </div>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col bg-slate-900/95 overflow-hidden justify-center items-center">
        {/* Graph Canvas Centered Block */}
        <div 
           className="relative border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden bg-slate-900"
           style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
             <GraphCanvas 
               cities={cities} 
               currentEvent={currentEvent} 
               bestPath={currentEvent?.bestPath ?? null}
               width={CANVAS_WIDTH} 
               height={CANVAS_HEIGHT} 
             />
        </div>
        
        {/* Dashboard Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex justify-around select-none min-w-[600px]">
            <div className="text-center flex-1">
               <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Current Try</p>
               <p className="text-xl font-mono text-yellow-400">
                 {currentEvent?.cost && currentEvent.cost !== Infinity && currentEvent.type !== 'DONE' 
                   ? currentEvent.cost.toFixed(1) 
                   : '---'}
               </p>
            </div>
            <div className="w-px bg-slate-700/50 mx-4"></div>
            <div className="text-center flex-1">
               <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Nodes Explored</p>
               <p className="text-xl font-mono text-blue-400">{stepIndex}</p>
            </div>
            <div className="w-px bg-slate-700/50 mx-4"></div>
            <div className="text-center flex-1">
               <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Best Distance</p>
               <p className={`text-xl font-mono ${isDone ? 'text-emerald-400 font-bold' : 'text-emerald-400/70'}`}>
                 {currentEvent?.bestCost && currentEvent.bestCost !== Infinity ? currentEvent.bestCost.toFixed(1) : '---'}
               </p>
            </div>
        </div>
      </div>
    </div>
  )
}

export default App


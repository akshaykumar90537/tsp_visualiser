# 🌍 Traveling Salesperson Tour Finder

## 📌 Project Title & Description
Solves the classical Traveling Salesman Problem (TSP) by finding the shortest possible route that visits every city exactly once and returns to the starting point. This interactive visualizer provides a dual-interface experience with both abstract 2D graph animations and a real-world map-based geonavigation simulator!

## 🚀 Features
- **2D Visualization:** Generate random cities on a Cartesian plane and animate the algorithm's step-by-step traversal and pruning logic.
- **Map Visualization:** Search and add real-world cities using OpenStreetMap's API to calculate actual geographic routes.
- **Algorithms Implemented:**
  - Nearest Neighbor (Fast, Heuristic)
  - Branch & Bound (Exact Solution)
  - Held-Karp Dynamic Programming (Exact Solution)
- **Advanced Diagnostics:** Dynamic dashboard analyzing execution time, theoretical time complexity, and real-time optimality gaps!
- **Algorithm Comparison:** Run all algorithms simultaneously across identical data points and compare execution performance analytically.

## 🛠️ Tech Stack
- **Frontend:** React.js + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Visualization:** SVG Graph Canvas
- **Map Integration:** Leaflet (`react-leaflet`) and OpenStreetMap Nominatim API 

## 📦 Installation & Setup
To run this project locally, execute the following instructions:

1. Clone the repository:
   ```bash
   git clone https://github.com/akshaykumar90537/tsp_visualiser.git
   ```
2. Navigate into the application directory:
   ```bash
   cd tsp-visualizer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## ▶️ How to Use
### 🔹 2D Visualization Mode
1. Ensure the top toggle is set to `2D Visualization`.
2. Select your desired number of cities using the slider, or click **"Randomize"** to generate a new graph.
3. Select an algorithm underneath the **Algorithms** section.
4. Click **"Run TSP Algorithm"** and watch the path construct visually!

### 🔹 Map Visualization Mode
1. Ensure the top toggle is set to `Map Visualization`.
2. Type a city name (e.g. "Mumbai") into the Search Bar and select it from the dropdown. 
3. Build up your custom real-world itinerary using the Add Interface.
4. Select your preferred optimal algorithm.
5. Click **"Compute Optimized Route"** to plot the final real world Haversine distances on the Leaflet map!

## 🧠 Algorithms Explained
- **Nearest Neighbor:** Starts at a node and continually visits the closest unvisited city. It is extremely fast computationally but rarely yields the 100% optimal sequence.
- **Branch & Bound:** Progressively builds a state-space tree calculating lower bounds at every step, discarding non-promising paths rapidly to find the mathematically perfect route.
- **Held-Karp (Dynamic Programming):** Leverages bitmasking subset-tracking to construct optimally exact solutions. Exceptionally heavy computational complexity restricts it to small nodes (`N ≤ 15`).

## 📊 Output
Upon executing the visualizer, the overlay provides instant access to:
- The dynamically mapped **route path**.
- The **Total distance** required to complete the cycle and return safely back to the origin city!
- The distinct Algorithm operating underneath the evaluation loop.
- The mathematically proven **optimality** status variance.

## 📁 Project Structure
```
src/
 ├── algorithms/
 │   ├── branchBound.ts
 │   ├── dp.ts
 │   └── greedy.ts
 ├── components/
 │   ├── GraphCanvas.tsx
 │   └── MapCanvas.tsx
 ├── types.ts
 ├── index.css
 ├── main.tsx
 └── App.tsx
```

## 🔧 Future Improvements
- [ ] Add AI-based route optimization algorithms (Genetic Algorithm / Ant Colony).
- [ ] Add real-time traffic-based routing constraints via Direction APIs.
- [ ] Improve UI/UX interactivity styling for mobile devices.
- [ ] Introduce a sleek 3D Mapbox routing engine.

## 🤝 Contribution
Contributions are very warmly welcomed!
1. Fork the repo!
2. Create your feature branch! (`git checkout -b feature/NewAlgorithm`)
3. Commit your changes! (`git commit -am 'Add an awesome improvement!'`)
4. Push to the branch! (`git push origin feature/NewAlgorithm`)
5. Submit a pull request!

## 📜 License
This logic is protected cleanly under the permissive **MIT License**.

## 🙌 Author
Developed meticulously by **Akshay Kumar** ([akshaykumar90537](https://github.com/akshaykumar90537)). Enjoy calculating those perfect paths!

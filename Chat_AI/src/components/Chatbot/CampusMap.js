import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { FaPlus, FaMinus, FaExpand, FaTimes, FaSync } from "react-icons/fa";

const CampusMap = ({ navigation: initialNavigation }) => {
  const [navigation, setNavigation] = useState(initialNavigation);
  const { nodes = [], edges = [], path = [] } = navigation || {};

  const [isMaximized, setIsMaximized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const API_URL = process.env.REACT_APP_BE_URL || "http://localhost:6230";

  // Constants
  const width = 400;
  const height = 600;
  const padding = 50;

  // Scale calculations
  const xCoords = nodes.map((n) => n.x);
  const zCoords = nodes.map((n) => n.z);
  const minX = Math.min(...xCoords, -60);
  const maxX = Math.max(...xCoords, 60);
  const minZ = Math.min(...zCoords, -20);
  const maxZ = Math.max(...zCoords, 220);

  const scaleX = (x) =>
    padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const scaleY = (z) =>
    height - padding - ((z - minZ) / (maxZ - minZ)) * (height - 2 * padding);

  const pathIds = useMemo(() => new Set(path.map((n) => n.id)), [path]);

  // Live Refresh Support
  const refreshGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/graph`);
      const data = await response.json();
      // Keep the current path if possible
      setNavigation((prev) => ({
        ...data,
        path: prev?.path || [],
      }));
    } catch (err) {
      console.error("Failed to refresh graph:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update when initialNavigation changes (from new chat messages)
  useEffect(() => {
    if (initialNavigation) {
      setNavigation(initialNavigation);
    } else {
      // If no initial navigation, fetch once for explorer mode
      refreshGraph();
    }
  }, [initialNavigation, refreshGraph]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isMaximized) toggleMaximize();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMaximized, toggleMaximize]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e) => {
      setOffset({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  const onMouseDown = (e) => {
    if (zoom > 1 || isMaximized) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      };
    }
  };

  const renderPath = () => {
    if (path.length < 2) return null;
    const points = path.map((n) => `${scaleX(n.x)},${scaleY(n.z)}`).join(" ");
    return (
      <g>
        <polyline
          points={points}
          fill="none"
          stroke="#00ffcc"
          strokeWidth={6 / (isMaximized ? 1 : zoom)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          className="path-glow"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#00ffcc"
          strokeWidth={2 / (isMaximized ? 1 : zoom)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${8 / zoom},${4 / zoom}`}
          className="path-animated"
        />
      </g>
    );
  };

  return (
    <div
      className={`campus-map-card ${isMaximized ? "map-fullscreen" : ""}`}
      style={{
        position: isMaximized ? "fixed" : "relative",
        top: isMaximized ? 0 : "auto",
        left: isMaximized ? 0 : "auto",
        width: isMaximized ? "100vw" : "100%",
        height: isMaximized ? "100vh" : "450px",
        zIndex: isMaximized ? 10000 : 1,
        background: "#0a0a0b",
        display: "flex",
        flexDirection: "column",
        borderRadius: isMaximized ? 0 : "15px",
        border: isMaximized ? "none" : "1px solid #333",
        overflow: "hidden",
        boxShadow: isMaximized ? "none" : "0 10px 40px rgba(0,0,0,0.6)",
        transition: isMaximized ? "none" : "all 0.3s ease",
      }}
    >
      <style>{`
        .path-animated { animation: dash 1s linear infinite; }
        @keyframes dash { to { stroke-dashoffset: -12; } }
        .map-btn {
          background: rgba(30, 30, 35, 0.9);
          border: 1px solid #444;
          color: #00ffcc;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
          backdrop-filter: blur(8px);
        }
        .map-btn:hover { background: #00ffcc; color: #000; }
        .map-btn.loading { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .building-label { pointer-events: none; font-weight: bold; }
      `}</style>

      {/* HUD Overlay */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          zIndex: 11,
        }}
      >
        <button className="map-btn" onClick={toggleMaximize}>
          {isMaximized ? <FaTimes /> : <FaExpand />}
        </button>
        <button
          className={`map-btn ${isLoading ? "loading" : ""}`}
          onClick={refreshGraph}
          title="Sync/Refresh JSON Data"
        >
          <FaSync />
        </button>
        <button className="map-btn" onClick={handleZoomIn}>
          <FaPlus />
        </button>
        <button className="map-btn" onClick={handleZoomOut}>
          <FaMinus />
        </button>
      </div>

      {isMaximized && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "25px",
            zIndex: 11,
            pointerEvents: "none",
          }}
        >
          <h1
            style={{
              color: "#fff",
              fontSize: "24px",
              margin: 0,
              letterSpacing: "1px",
            }}
          >
            CAMPUS CONFIGURATOR
          </h1>
          <p style={{ color: "#00ffcc", fontSize: "11px", margin: "4px 0" }}>
            Live previewing campus_graph.json
          </p>
        </div>
      )}

      {/* Map Surface */}
      <div
        style={{
          flex: 1,
          cursor: isDragging
            ? "grabbing"
            : zoom > 1 || isMaximized
              ? "grab"
              : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at center, #111 0%, #050505 100%)",
        }}
        onMouseDown={onMouseDown}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: isMaximized ? "auto" : "100%",
            height: isMaximized ? "90vh" : "100%",
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {/* Main Corridor */}
          <rect
            x={scaleX(-4)}
            y={scaleY(maxZ)}
            width={8}
            height={scaleY(minZ) - scaleY(maxZ)}
            fill="#151515"
          />

          {/* Edge lines */}
          {edges.map((edge, i) => {
            const from = nodes.find((n) => n.id === edge.from);
            const to = nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={scaleX(from.x)}
                y1={scaleY(from.z)}
                x2={scaleX(to.x)}
                y2={scaleY(to.z)}
                stroke="#222"
                strokeWidth={1 / zoom}
              />
            );
          })}

          {renderPath()}

          {/* Landmarks */}
          {nodes.map((node) => {
            const isHighlight = pathIds.has(node.id);
            const isBlock =
              node.id.includes("block") ||
              node.id.includes("canteen") ||
              node.id.includes("ground") ||
              node.id.includes("greens") ||
              node.id.includes("parking") ||
              node.id.includes("tea") ||
              node.id.includes("annapurna");

            return (
              <g key={node.id}>
                {isBlock ? (
                  <rect
                    x={scaleX(node.x) - 20}
                    y={scaleY(node.z) - 12}
                    width="40"
                    height="24"
                    rx="4"
                    fill={
                      isHighlight
                        ? "rgba(0, 255, 204, 0.15)"
                        : "rgba(255,255,255,0.03)"
                    }
                    stroke={isHighlight ? "#00ffcc" : "#333"}
                    strokeWidth={isHighlight ? 2 / zoom : 1 / zoom}
                    style={{ transition: "all 0.3s" }}
                  />
                ) : (
                  <circle
                    cx={scaleX(node.x)}
                    cy={scaleY(node.z)}
                    r={isHighlight ? 5 / zoom : 3 / zoom}
                    fill={isHighlight ? "#00ffcc" : "#444"}
                    filter={isHighlight ? "url(#glow)" : ""}
                  />
                )}
                <text
                  x={scaleX(node.x)}
                  y={scaleY(node.z) + (isBlock ? 0 : -8 / zoom)}
                  textAnchor="middle"
                  dominantBaseline={isBlock ? "middle" : "auto"}
                  fill={isHighlight ? "#00ffcc" : isMaximized ? "#bbb" : "#777"}
                  fontSize={(isMaximized && !isBlock ? 8 : 6.5) / zoom}
                  className="building-label"
                >
                  {node.label.split("(")[0].trim()}
                </text>
              </g>
            );
          })}

          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={1.5} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
      </div>

      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(5px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isLoading ? "#ffcc00" : "#00ffcc",
              boxShadow: `0 0 10px ${isLoading ? "#ffcc00" : "#00ffcc"}`,
            }}
          ></div>
          <span
            style={{
              fontSize: "11px",
              color: isLoading ? "#ffcc00" : "#00ffcc",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            {isLoading
              ? "Syncing..."
              : path.length > 0
                ? "Live Navigation"
                : "Campus Explorer"}
          </span>
        </div>
        <span style={{ fontSize: "10px", color: "#666" }}>
          {isMaximized
            ? "Drag to pan • Click Sync to refresh JSON changes"
            : `Zoom x${zoom.toFixed(1)}`}
        </span>
      </div>
    </div>
  );
};

export default CampusMap;

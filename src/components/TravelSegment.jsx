function TravelSegment({
  event,
  nextEvent,
  mode,
  segment,
  hasOrigin,
  hasDestination,
  isHovered,
  isPreviewMode,
  onModeChange,
  onMouseEnter,
  onMouseLeave,
  routeError,
}) {
  const icon =
    mode === "DRIVING"
      ? "🚗"
      : mode === "TRANSIT"
      ? "🚆"
      : mode === "BICYCLING"
      ? "🚲"
      : "🚶";

  return (
    <div
      className={`travel-segment ${isHovered ? "travel-segment-hovered" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="travel-line">{icon}</div>

      <select
        className="travel-select"
        disabled={isPreviewMode}
        value={mode}
        onChange={(e) => onModeChange(event.id, "mode", e.target.value)}
      >
        <option value="WALKING">Walk</option>
        <option value="DRIVING">Drive</option>
        <option value="TRANSIT">Transit</option>
        <option value="BICYCLING">Bike</option>
      </select>

      <span className="travel-duration">
        {!hasOrigin || !hasDestination
          ? "Add locations"
          : routeError
          ? routeError
          : segment
          ? `${segment.duration} • ${segment.distance}`
          : "Calculating..."}
      </span>
    </div>
  );
}

export default TravelSegment;
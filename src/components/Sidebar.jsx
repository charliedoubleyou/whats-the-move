import EventCard from "./EventCard";
import TravelSegment from "./TravelSegment";

function Sidebar(props) {
  const {
    moveName,
    setMoveName,
    creatorName,
    setCreatorName,
    events,
    isPreviewMode,
    isEditingMoveName,
    setIsEditingMoveName,
    isEditingCreator,
    setIsEditingCreator,
    selectedEventId,
    setSelectedEventId,
    eventCoordinates,
    travelSegments,
    routeSegments,
    hoveredSegmentKey,
    setHoveredSegmentKey,
    draggingIndex,
    dragOverIndex,
    newEventRef,
    mapRef,
    routeErrors,
    handleMoveNameDone,
    handleCreatorDone,
    handleAddEvent,
    handleEventChange,
    handleSaveEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleAutocompleteLoad,
    handlePlaceChanged,
    handleTravelChange,
    getComputedEventTimes,
    getScheduleConflict,
  } = props;

  return (
    <section className="sidebar">
        <div className="sidebar-header">
        {isEditingMoveName ? (
            <input
            autoFocus
            className="move-title-input"
            type="text"
            value={moveName}
            onChange={(e) => setMoveName(e.target.value)}
            onBlur={handleMoveNameDone}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                handleMoveNameDone();
                e.currentTarget.blur();
                }
            }}
            placeholder="e.g. Friday Night in Palo Alto"
            />
        ) : (
            <button
            className="move-title-display"
            onClick={() => setIsEditingMoveName(true)}
            >
            {moveName}
            </button>
        )}

        {(!isPreviewMode || creatorName.trim()) && (
            <div className="creator-row">
                {isEditingCreator ? (
                <>
                    <span>by</span>

                    <input
                    className="creator-input"
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    onBlur={handleCreatorDone}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                        handleCreatorDone();
                        e.currentTarget.blur();
                        }
                    }}
                    placeholder="enter your name"
                    />
                </>
                ) : (
                <button
                    className="creator-preview"
                    onClick={() => setIsEditingCreator(true)}
                >
                    {creatorName.trim()}'s move
                </button>
                )}
            </div>
            )}
        </div>

        {!isPreviewMode && (
        <button className="add-btn" onClick={handleAddEvent}>
            + Add Event
        </button>
        )}

        <div className="stop-list">
        {events.length === 0 ? (
            <div className="empty-state">
                <p>{isPreviewMode ? "Nothing planned yet" : "No events yet"}</p>
                {!isPreviewMode && (
                    <p className="empty-subtext">
                    Add your first event to start building your move!
                    </p>
                )}
                </div>
        ) : (
            events.map((event, index) => (
            <div key={event.id}>
                <EventCard
                event={event}
                index={index}
                eventsLength={events.length}
                isPreviewMode={isPreviewMode}
                isSelected={selectedEventId === event.id}
                isDragging={draggingIndex === index}
                isDragOver={dragOverIndex === index}
                computedTimes={getComputedEventTimes(event, index)}
                scheduleConflict={getScheduleConflict(event, index)}
                newEventRef={newEventRef}
                onSelect={() => {
                    setSelectedEventId(event.id);
                    if (eventCoordinates[event.id]) {
                    mapRef.current?.panTo(eventCoordinates[event.id]);
                    }
                }}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onChange={handleEventChange}
                onSave={handleSaveEvent}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onAutocompleteLoad={handleAutocompleteLoad}
                onPlaceChanged={handlePlaceChanged}
                onAddEvent={handleAddEvent}
                />

                {index < events.length - 1 && (() => {
                const nextEvent = events[index + 1];
                const mode = travelSegments[event.id]?.mode || "WALKING";
                const segmentKey = `${event.id}-${nextEvent.id}-${mode}`;
                const segment = routeSegments[segmentKey];

                return (
                    <TravelSegment
                    event={event}
                    nextEvent={nextEvent}
                    mode={mode}
                    segment={segment}
                    routeError={routeErrors[segmentKey]}
                    hasOrigin={Boolean(eventCoordinates[event.id])}
                    hasDestination={Boolean(eventCoordinates[nextEvent.id])}
                    isHovered={hoveredSegmentKey === segmentKey}
                    isPreviewMode={isPreviewMode}
                    onModeChange={handleTravelChange}
                    onMouseEnter={() => setHoveredSegmentKey(segmentKey)}
                    onMouseLeave={() => setHoveredSegmentKey(null)}
                    />
                );
                })()}
            </div>
            ))
        )}
        </div>
    </section>
  );
}

export default Sidebar;
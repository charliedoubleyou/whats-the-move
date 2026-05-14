import { Autocomplete } from "@react-google-maps/api";
import { timeOptions, durationOptions } from "../utils/constants";

function EventCard({
  event,
  index,
  eventsLength,
  isPreviewMode,
  isSelected,
  isDragging,
  isDragOver,
  computedTimes,
  scheduleConflict,
  newEventRef,
  onSelect,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onChange,
  onSave,
  onEdit,
  onDelete,
  onAutocompleteLoad,
  onPlaceChanged,
  onAddEvent,
}) {
  return (
    <div
      className={`stop-card event-card ${isSelected ? "event-card-selected" : ""} ${
        isDragging ? "dragging" : ""
      } ${isDragOver ? "drag-over" : ""}`}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="stop-number">{index + 1}</div>

      {!isPreviewMode && (
        <div
          className="drag-handle"
          title="Drag to reorder"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}

      <div className="stop-content">
        {event.isEditing && !isPreviewMode ? (
          <div className="editing-event">
            <input
              ref={index === eventsLength - 1 ? newEventRef : null}
              className="event-title-input"
              type="text"
              value={event.title}
              onChange={(e) => onChange(event.id, "title", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSave(event.id);

                  if (index === eventsLength - 1) {
                    setTimeout(() => onAddEvent(), 0);
                  }
                }
              }}
              placeholder="Event title"
            />

            {event.error && <p className="field-error">{event.error}</p>}

            <div className="time-mode-toggle">
              <button
                type="button"
                className={event.timeMode === "fixed" ? "time-mode-active" : ""}
                onClick={() => onChange(event.id, "timeMode", "fixed")}
              >
                Fixed time
              </button>

              <button
                type="button"
                className={event.timeMode === "duration" ? "time-mode-active" : ""}
                onClick={() => onChange(event.id, "timeMode", "duration")}
              >
                Duration
              </button>
            </div>

            {event.timeMode === "fixed" ? (
              <div className="time-row">
                <select
                  className="event-field-input time-select"
                  value={event.startTime}
                  onChange={(e) => onChange(event.id, "startTime", e.target.value)}
                >
                  {timeOptions.map((time) => (
                    <option key={`start-${time}`} value={time}>
                      {time || "Start time"}
                    </option>
                  ))}
                </select>

                <span className="time-separator">to</span>

                <select
                  className="event-field-input time-select"
                  value={event.endTime}
                  onChange={(e) => onChange(event.id, "endTime", e.target.value)}
                >
                  {timeOptions.map((time) => (
                    <option key={`end-${time}`} value={time}>
                      {time || "End time"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="time-row">
                <select
                  className="event-field-input time-select"
                  value={event.durationMinutes}
                  onChange={(e) =>
                    onChange(event.id, "durationMinutes", e.target.value)
                  }
                >
                  {durationOptions.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration ? `${duration} min` : "Event duration"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Autocomplete
              onLoad={(autocomplete) => onAutocompleteLoad(event.id, autocomplete)}
              onPlaceChanged={() => onPlaceChanged(event.id)}
            >
              <input
                className="event-field-input"
                type="text"
                value={event.location}
                onChange={(e) => onChange(event.id, "location", e.target.value)}
                placeholder="Search for a location"
              />
            </Autocomplete>

            <textarea
              className="event-details-input"
              value={event.details}
              onChange={(e) => onChange(event.id, "details", e.target.value)}
              placeholder="Details"
              rows="3"
            />

            <div className="event-card-actions">
              <button className="save-event-btn" onClick={() => onSave(event.id)}>
                Done
              </button>

              <button className="delete-event-btn" onClick={() => onDelete(event.id)}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="saved-event collapsed-event">
            <div className="timeline-content">
              <h3>{event.title || "Untitled event"}</h3>

              {event.location ? (
                <p className="timeline-location">{event.location}</p>
              ) : !isPreviewMode ? (
                <p className="timeline-location">No location</p>
              ) : null}

              {event.details && <p className="timeline-details">{event.details}</p>}

              {scheduleConflict && (
                <p className="schedule-warning">{scheduleConflict}</p>
              )}

              {!isPreviewMode && (
                <div className="event-card-actions">
                  <button
                    className="edit-event-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(event.id);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-event-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(event.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {(computedTimes.startTime || computedTimes.endTime) && (
              <div className="timeline-time-right">
                {event.timeMode === "duration" && computedTimes.startTime && (
                  <span className="auto-label">Auto</span>
                )}

                <span>
                  {computedTimes.startTime && computedTimes.endTime
                    ? `${computedTimes.startTime} – ${computedTimes.endTime}`
                    : computedTimes.endTime}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
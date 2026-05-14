import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { mapContainerStyle, defaultCenter } from "../utils/constants";

function MapPanel({
  events,
  eventCoordinates,
  selectedEventId,
  setSelectedEventId,
  hoveredEventId,
  setHoveredEventId,
  mapRef,
  onMapLoad,
  onMapUnmount,
}) {
  return (
    <section className="map-panel">
      <div className="map-container">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={13}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
        >
          {window.google &&
            events.map((event, index) =>
              eventCoordinates[event.id] ? (
                <div key={event.id}>
                  <Marker
                    position={eventCoordinates[event.id]}
                    onMouseOver={() => setHoveredEventId(event.id)}
                    onMouseOut={() => setHoveredEventId(null)}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      mapRef.current?.panTo(eventCoordinates[event.id]);
                    }}
                    label={{
                      text: `${index + 1}`,
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "700",
                    }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: selectedEventId === event.id ? 20 : 16,
                      fillColor:
                        selectedEventId === event.id ? "#ff6b35" : "#1f1f1f",
                      fillOpacity: 1,
                      strokeColor: "white",
                      strokeWeight: 3,
                    }}
                  />

                  {hoveredEventId === event.id && (
                    <InfoWindow
                      position={eventCoordinates[event.id]}
                      onCloseClick={() => setHoveredEventId(null)}
                    >
                      <div className="marker-preview">
                        <strong>{event.title || "Untitled event"}</strong>
                        {event.location && <p>{event.location}</p>}
                      </div>
                    </InfoWindow>
                  )}
                </div>
              ) : null
            )}
        </GoogleMap>
      </div>
    </section>
  );
}

export default MapPanel;
import { useState, useRef, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

import { mapContainerStyle, defaultCenter, libraries, timeOptions, durationOptions } from "./utils/constants";
import { timeToMinutes, minutesToTime, durationTextToMinutes, isInvalidTimeRange } from "./utils/time";
import { getGoogleTravelMode, getTravelModeLabel, getRouteStyle } from "./utils/map";
import { getSavedDraft, saveDraft } from "./utils/storage";
import { supabase } from "./utils/supabase";

import Topbar from "./components/Topbar";
import EventCard from "./components/EventCard";
import TravelSegment from "./components/TravelSegment";
import MapPanel from "./components/MapPanel";
import Sidebar from "./components/Sidebar";

import "./App.css";


function App() {

  const savedDraft = getSavedDraft();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [moveName, setMoveName] = useState(savedDraft?.moveName || "");
  const [events, setEvents] = useState(savedDraft?.events || []);
  const [travelSegments, setTravelSegments] = useState(savedDraft?.travelSegments || {});
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [eventCoordinates, setEventCoordinates] = useState(savedDraft?.eventCoordinates || {});
  const [autocompleteRefs, setAutocompleteRefs] = useState({});
  const [routeSegments, setRouteSegments] = useState({});
  const [hoveredSegmentKey, setHoveredSegmentKey] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [creatorName, setCreatorName] = useState(savedDraft?.creatorName || "");
  const [isEditingMoveName, setIsEditingMoveName] = useState(!savedDraft?.moveName);
  const [isEditingCreator, setIsEditingCreator] = useState(!savedDraft?.creatorName);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [routeErrors, setRouteErrors] = useState({});
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [isLoadingSharedMove, setIsLoadingSharedMove] = useState(false);

  const newEventRef = useRef(null);
  const routeRequestIdRef = useRef(0);
  const mapRef = useRef(null);
  const routePolylinesRef = useRef([]);
  const hasAutoFitRef = useRef(false);
  const moveId = window.location.pathname.startsWith("/move/")
    ? window.location.pathname.split("/move/")[1]
    : null;

  function handleMoveNameDone() {
    if (moveName.trim()) {
      setIsEditingMoveName(false);
    }
  }
  
  function handleCreatorDone() {
    if (creatorName.trim()) {
      setIsEditingCreator(false);
    }
  }

  function handleAddEvent() {
    const newEvent = {
      id: Date.now(),
      title: "",
      location: "",
      timeMode: "fixed",
      startTime: "",
      endTime: "",
      durationMinutes: "",
      details: "",
      isEditing: true,
      error: "",
    };

    setEvents((prev) => [...prev, newEvent]);

    setTimeout(() => {
      newEventRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      newEventRef.current?.focus();
    }, 0);
  }

  function handleDeleteEvent(id) {
    routeRequestIdRef.current += 1;
    clearMapRouteLines();
    setRouteSegments({});

    setEvents((prevEvents) => prevEvents.filter((event) => event.id !== id));

    setEventCoordinates((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    setTravelSegments((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }

  function handleEventChange(id, field, value) {
    setEvents(
      events.map((event) =>
        event.id === id
          ? {
              ...event,
              [field]: value,
              error: field === "title" && value.trim() ? "" : event.error,
            }
          : event
      )
    );
  }

  function handleDragStart(e, index) {
    setDraggingIndex(index);
    e.dataTransfer.setData("dragIndex", index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e, dropIndex) {
    const dragIndex = Number(e.dataTransfer.getData("dragIndex"));

    if (dragIndex === dropIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedEvents = [...events];
    const [draggedEvent] = updatedEvents.splice(dragIndex, 1);
    updatedEvents.splice(dropIndex, 0, draggedEvent);

    setEvents(updatedEvents);
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function getComputedEventTimes(event, index) {
    if (event.timeMode === "fixed") {
      return {
        startTime: event.startTime,
        endTime: event.endTime,
      };
    }

    if (event.timeMode !== "duration") {
      return {
        startTime: "",
        endTime: "",
      };
    }

    const previousEvent = events[index - 1];

    if (!previousEvent || !event.durationMinutes) {
      return {
        startTime: "",
        endTime: event.durationMinutes ? `${event.durationMinutes} min` : "",
      };
    }

    const previousTimes = getComputedEventTimes(previousEvent, index - 1);
    const previousEndMinutes = timeToMinutes(previousTimes.endTime);

    if (previousEndMinutes === null) {
      return {
        startTime: "",
        endTime: `${event.durationMinutes} min`,
      };
    }

    const previousMode = travelSegments[previousEvent.id]?.mode || "WALKING";
    const segmentKey = `${previousEvent.id}-${event.id}-${previousMode}`;
    const travelMinutes = durationTextToMinutes(routeSegments[segmentKey]?.duration) || 0;

    const startMinutes = previousEndMinutes + travelMinutes;
    const endMinutes = startMinutes + Number(event.durationMinutes);

    return {
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
    };
  }

  function getScheduleConflict(event, index) {
    if (index === 0) return "";

    if (event.timeMode !== "fixed") return "";

    if (!event.startTime) return "";

    const previousEvent = events[index - 1];
    const previousTimes = getComputedEventTimes(previousEvent, index - 1);

    if (!previousTimes.endTime) return "";

    const previousEndMinutes = timeToMinutes(previousTimes.endTime);
    const currentStartMinutes = timeToMinutes(event.startTime);

    if (previousEndMinutes === null || currentStartMinutes === null) return "";

    const previousMode = travelSegments[previousEvent.id]?.mode || "WALKING";
    const segmentKey = `${previousEvent.id}-${event.id}-${previousMode}`;
    const travelMinutes = durationTextToMinutes(routeSegments[segmentKey]?.duration) || 0;

    const earliestArrival = previousEndMinutes + travelMinutes;

    if (currentStartMinutes < earliestArrival) {
      return `Timing conflict: earliest arrival is ${minutesToTime(earliestArrival)}.`;
    }

    return "";
  }

  function handleSaveEvent(id) {
    setEvents(
      events.map((event, index) => {
        if (event.id !== id) return event;

        if (!event.title.trim()) {
          return {
            ...event,
            error: "Give this event a title before saving",
          };
        }

        if (
          event.timeMode === "fixed" &&
          isInvalidTimeRange(event.startTime, event.endTime)
        ) {
          return {
            ...event,
            error: "Start time must be before end time.",
          };
        }

        if (event.timeMode === "duration") {
          if (!event.durationMinutes) {
            return {
              ...event,
              error: "Choose how long this event will last.",
            };
          }

          if (index === 0) {
            return {
              ...event,
              error: "The first event needs a fixed start and end time.",
            };
          }

          const previousEvent = events[index - 1];
          const previousTimes = getComputedEventTimes(previousEvent, index - 1);

          if (!previousTimes.endTime || timeToMinutes(previousTimes.endTime) === null) {
            return {
              ...event,
              error: "This event needs the previous event to have an end time.",
            };
          }
        }

        const savedEvent = {
          ...event,
          isEditing: false,
          error: "",
        };

        geocodeEventLocation(savedEvent);

        setTimeout(() => {
          const nextInput = document.querySelectorAll(".event-title-input")[index + 1];
          nextInput?.focus();
        }, 0);

        return savedEvent;
      })
    );
  }

  function handleEditEvent(id) {
    setEvents(
      events.map((event) =>
        event.id === id ? { ...event, isEditing: true } : event
      )
    );
  }

  function handleTravelChange(fromEventId, field, value) {
    routeRequestIdRef.current += 1;
    clearMapRouteLines();
    setRouteSegments({});
    setRouteErrors({});

    setTravelSegments((prev) => ({
      ...prev,
      [fromEventId]: {
        mode: prev[fromEventId]?.mode || "WALKING",
        ...prev[fromEventId],
        [field]: value,
      },
    }));
  }

  function geocodeEventLocation(event) {
    if (!event.location.trim()) return;

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address: event.location }, (results, status) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;

        setEventCoordinates((prev) => ({
          ...prev,
          [event.id]: {
            lat: location.lat(),
            lng: location.lng(),
          },
        }));
      } else {
        console.log("Geocode failed:", status);
      }
    });
  }

  function handleAutocompleteLoad(eventId, autocomplete) {
    setAutocompleteRefs((prev) => ({
      ...prev,
      [eventId]: autocomplete,
    }));
  }

  function handlePlaceChanged(eventId) {
    const autocomplete = autocompleteRefs[eventId];
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) return;

    const locationName = place.name || place.formatted_address || "";

    handleEventChange(eventId, "location", locationName);

    hasAutoFitRef.current = false;

    setEventCoordinates((prev) => ({
      ...prev,
      [eventId]: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    }));
  }

  function clearMapRouteLines() {
    routePolylinesRef.current.forEach((line) => {
      line.setMap(null);
    });

    routePolylinesRef.current = [];
  }

  function handleCopySummary() {
    const title = moveName.trim() || "Untitled Move";
    const creator = creatorName.trim()
      ? `${creatorName.trim()}'s move`
      : "Move";

    const lines = [`${title} — ${creator}`, ""];

    events.forEach((event, index) => {
      const computedTimes = getComputedEventTimes(event, index);
      const timeText =
        computedTimes.startTime && computedTimes.endTime
          ? ` (${computedTimes.startTime} – ${computedTimes.endTime})`
          : "";

      lines.push(`${index + 1}. ${event.title || "Untitled event"}${timeText}`);

      if (event.location) {
        lines.push(`   ${event.location}`);
      }

      if (event.details) {
        lines.push(`   ${event.details}`);
      }

      const nextEvent = events[index + 1];

      if (nextEvent) {
        const mode = travelSegments[event.id]?.mode || "WALKING";
        const segmentKey = `${event.id}-${nextEvent.id}-${mode}`;
        const segment = routeSegments[segmentKey];

        if (segment) {
          lines.push(
            `   → ${getTravelModeLabel(mode)} • ${segment.duration} • ${segment.distance}`
          );
        }
      }

      lines.push("");
    });

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDuplicateMove() {
    const duplicatedEvents = events.map((event) => ({
      ...event,
      id: Date.now() + Math.random(),
      isEditing: false,
      error: "",
    }));

    const idMap = {};

    events.forEach((event, index) => {
      idMap[event.id] = duplicatedEvents[index].id;
    });

    const duplicatedCoordinates = {};

    Object.entries(eventCoordinates).forEach(([oldId, coords]) => {
      duplicatedCoordinates[idMap[oldId]] = coords;
    });

    const duplicatedTravelSegments = {};

    Object.entries(travelSegments).forEach(([oldId, segment]) => {
      duplicatedTravelSegments[idMap[oldId]] = segment;
    });

    saveDraft({
      moveName,
      creatorName,
      events: duplicatedEvents,
      travelSegments: duplicatedTravelSegments,
      eventCoordinates: duplicatedCoordinates,
    });

    window.location.href = "/";
  }

  async function handleShareMove() {
    setIsSharing(true);
    setShareError("");

    const moveData = {
      moveName,
      creatorName,
      events,
      travelSegments,
      eventCoordinates,
    };

    const { data, error } = await supabase
      .from("moves")
      .insert([{ move_data: moveData }])
      .select("id")
      .single();

    setIsSharing(false);

    if (error) {
      console.error("Could not share move:", error);
      setShareError("Could not create share link.");
      return;
    }

    const shareUrl = `${window.location.origin}/move/${data.id}`;
    await navigator.clipboard.writeText(shareUrl);

    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  useEffect(() => {
    clearMapRouteLines();
    setRouteSegments({});
    setRouteErrors({});

    if (!window.google || !mapRef.current || !isMapReady || events.length < 2) return;

    const requestId = routeRequestIdRef.current + 1;
    routeRequestIdRef.current = requestId;

    const directionsService = new window.google.maps.DirectionsService();

    events.forEach((event, index) => {
      const nextEvent = events[index + 1];
      if (!nextEvent) return;

      const origin = eventCoordinates[event.id];
      const destination = eventCoordinates[nextEvent.id];
      if (!origin || !destination) return;

      const mode = travelSegments[event.id]?.mode || "WALKING";
      const segmentKey = `${event.id}-${nextEvent.id}-${mode}`;

      directionsService.route(
        {
          origin,
          destination,
          travelMode: getGoogleTravelMode(mode),
        },
        (result, status) => {
          if (routeRequestIdRef.current !== requestId) return;

          if (status === "OK") {
            const route = result.routes[0];
            const leg = route.legs[0];

            const routeLine = new window.google.maps.Polyline({
              path: route.overview_path,
              map: mapRef.current,
              ...getRouteStyle(mode),
            });

            routeLine.segmentKey = segmentKey;
            routeLine.mode = mode;

            const infoWindow = new window.google.maps.InfoWindow();

            routeLine.addListener("mouseover", (e) => {
              setHoveredSegmentKey(segmentKey);

              infoWindow.setContent(
                `${getTravelModeLabel(mode)} • ${leg.duration.text} • ${leg.distance.text}`
              );
              infoWindow.setPosition(e.latLng);
              infoWindow.open(mapRef.current);
            });

            routeLine.addListener("mouseout", () => {
              setHoveredSegmentKey(null);
              infoWindow.close();
            });

            routePolylinesRef.current.push(routeLine);

            setRouteSegments((prev) => ({
              ...prev,
              [segmentKey]: {
                fromId: event.id,
                toId: nextEvent.id,
                mode,
                duration: leg.duration.text,
                distance: leg.distance.text,
              },
            }));
          } else {
            setRouteErrors((prev) => ({
              ...prev,
              [segmentKey]: "Route unavailable. Try another mode.",
            }));

            console.log("Directions failed:", status);
          }
        }
      );
    });

    return () => {
      routeRequestIdRef.current += 1;
      clearMapRouteLines();
    };
  }, [events, eventCoordinates, travelSegments, isMapReady]);

  useEffect(() => {
    routePolylinesRef.current.forEach((line) => {
      const isHovered = line.segmentKey === hoveredSegmentKey;
      const baseStyle = getRouteStyle(line.mode);

      line.setOptions({
        ...baseStyle,
        strokeColor: isHovered ? "#ff6b35" : baseStyle.strokeColor,
        strokeWeight: isHovered ? 9 : baseStyle.strokeWeight,
        strokeOpacity: isHovered ? 1 : baseStyle.strokeOpacity,
        icons:
          line.mode === "WALKING"
            ? baseStyle.icons?.map((iconConfig) => ({
                ...iconConfig,
                icon: {
                  ...iconConfig.icon,
                  strokeColor: isHovered ? "#ff6b35" : "#174a7a",
                },
              }))
            : baseStyle.icons,
      });
    });
  }, [hoveredSegmentKey]);

  useEffect(() => {
    if (!window.google || !mapRef.current) return;

    const coords = events
      .map((event) => eventCoordinates[event.id])
      .filter(Boolean);

    if (coords.length === 0) {
      hasAutoFitRef.current = false;
      return;
    }

    // Only auto-fit once, so user panning/zooming does not constantly reset
    if (hasAutoFitRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();

    coords.forEach((coord) => {
      bounds.extend(coord);
    });

    if (coords.length === 1) {
      mapRef.current.panTo(coords[0]);
      mapRef.current.setZoom(14);
    } else {
      mapRef.current.fitBounds(bounds);
    }

    hasAutoFitRef.current = true;
  }, [eventCoordinates]);

  useEffect(() => {
    if (moveId) return;

    saveDraft({
      moveName,
      creatorName,
      events,
      travelSegments,
      eventCoordinates,
    });
  }, [
    moveId,
    moveName,
    creatorName,
    events,
    travelSegments,
    eventCoordinates,
  ]);

  useEffect(() => {
    async function loadSharedMove() {
      if (!moveId) return;

      setIsLoadingSharedMove(true);

      const { data, error } = await supabase
        .from("moves")
        .select("move_data")
        .eq("id", moveId)
        .single();

      if (error) {
        console.error("Could not load shared move:", error);
        setIsLoadingSharedMove(false);
        return;
      }

      const move = data.move_data;

      setMoveName(move.moveName || "");
      setCreatorName(move.creatorName || "");
      setEvents(move.events || []);
      setTravelSegments(move.travelSegments || {});
      setEventCoordinates(move.eventCoordinates || {});

      setIsPreviewMode(true);
      setIsLoadingSharedMove(false);
    }

    loadSharedMove();
  }, [moveId]);

  if (!isLoaded) {
    return <div className="loading-screen">Loading map...</div>;
  }
  if (isLoadingSharedMove) {
    return <div className="loading-screen">Loading move...</div>;
  }

  return (
      <div className={`app ${isPreviewMode ? "preview-mode" : ""}`}>
      <Topbar
        isPreviewMode={isPreviewMode}
        setIsPreviewMode={setIsPreviewMode}
        handleCopySummary={handleCopySummary}
        handleShareMove={handleShareMove}
        copied={copied}
        shareCopied={shareCopied}
        isSharing={isSharing}
        shareError={shareError}
        moveId={moveId}
        handleDuplicateMove={handleDuplicateMove}
      />

      <main className="layout">
        <Sidebar
          moveName={moveName}
          setMoveName={setMoveName}
          creatorName={creatorName}
          setCreatorName={setCreatorName}
          events={events}
          isPreviewMode={isPreviewMode}
          isEditingMoveName={isEditingMoveName}
          setIsEditingMoveName={setIsEditingMoveName}
          isEditingCreator={isEditingCreator}
          setIsEditingCreator={setIsEditingCreator}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventCoordinates={eventCoordinates}
          travelSegments={travelSegments}
          routeSegments={routeSegments}
          hoveredSegmentKey={hoveredSegmentKey}
          setHoveredSegmentKey={setHoveredSegmentKey}
          draggingIndex={draggingIndex}
          dragOverIndex={dragOverIndex}
          newEventRef={newEventRef}
          mapRef={mapRef}
          routeErrors={routeErrors}
          handleMoveNameDone={handleMoveNameDone}
          handleCreatorDone={handleCreatorDone}
          handleAddEvent={handleAddEvent}
          handleEventChange={handleEventChange}
          handleSaveEvent={handleSaveEvent}
          handleEditEvent={handleEditEvent}
          handleDeleteEvent={handleDeleteEvent}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleDragEnd={handleDragEnd}
          handleAutocompleteLoad={handleAutocompleteLoad}
          handlePlaceChanged={handlePlaceChanged}
          handleTravelChange={handleTravelChange}
          getComputedEventTimes={getComputedEventTimes}
          getScheduleConflict={getScheduleConflict}
        />

        <MapPanel
          events={events}
          eventCoordinates={eventCoordinates}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          hoveredEventId={hoveredEventId}
          setHoveredEventId={setHoveredEventId}
          mapRef={mapRef}
          onMapLoad={(map) => {
            mapRef.current = map;
            setIsMapReady(true);
          }}
          onMapUnmount={() => {
            clearMapRouteLines();
            mapRef.current = null;
            setIsMapReady(false);
          }}
        />
      </main>
    </div>
  );
}

export default App;


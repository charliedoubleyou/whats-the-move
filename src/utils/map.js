export function getGoogleTravelMode(mode) {
  const modes = {
    WALKING: window.google.maps.TravelMode.WALKING,
    DRIVING: window.google.maps.TravelMode.DRIVING,
    TRANSIT: window.google.maps.TravelMode.TRANSIT,
    BICYCLING: window.google.maps.TravelMode.BICYCLING,
  };

  return modes[mode] || window.google.maps.TravelMode.WALKING;
}

export function getTravelModeLabel(mode) {
  const labels = {
    WALKING: "Walk",
    DRIVING: "Drive",
    TRANSIT: "Transit",
    BICYCLING: "Bike",
  };

  return labels[mode] || "Walk";
}

export function getRouteStyle(mode) {
  if (mode === "WALKING") {
    return {
      strokeColor: "#174a7a",
      strokeOpacity: 0,
      strokeWeight: 5,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 1,
            strokeColor: "#174a7a",
            scale: 4,
          },
          offset: "0",
          repeat: "14px",
        },
      ],
    };
  }

  if (mode === "TRANSIT") {
    return {
      strokeColor: "#7a3ef0",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    };
  }

  if (mode === "BICYCLING") {
    return {
      strokeColor: "#2e7d32",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    };
  }

  return {
    strokeColor: "#174a7a",
    strokeOpacity: 0.9,
    strokeWeight: 5,
  };
}
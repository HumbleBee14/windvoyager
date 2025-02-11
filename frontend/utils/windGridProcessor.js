export function generateWindGridFromBalloonData(balloonTrajectory) {
    if (!balloonTrajectory || balloonTrajectory.length === 0) return null;

    const windGrid = [];

    for (let i = 0; i < balloonTrajectory.length - 1; i++) {
        const curr = balloonTrajectory[i];
        const next = balloonTrajectory[i + 1];

        if (!curr || !next) continue;

        // Calculate wind speed (U, V components)
        const dx = next.position[1] - curr.position[1]; // Longitude diff
        const dy = next.position[0] - curr.position[0]; // Latitude diff
        const dt = 1; // Assume 1-hour interval

        const u = dx / dt; // Eastward wind component
        const v = dy / dt; // Northward wind component

        windGrid.push({
            lat: curr.position[0],
            lon: curr.position[1],
            u: parseFloat(u.toFixed(3)),
            v: parseFloat(v.toFixed(3))
        });
    }

    return { data: windGrid };
}

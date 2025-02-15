// src/utils/trajectoryUtils.js
export const getTimezoneBalloonTrajectories = (completeData, groupedData, selectedTimezone) => {
    if (!selectedTimezone || !groupedData || !groupedData[selectedTimezone] || !completeData) {
        return [];
    }

    const timezoneBalloons = groupedData[selectedTimezone];
    const trajectories = [];

    timezoneBalloons.forEach(balloon => {
        const trajectory = [];

        for (let hour = 0; hour < 24; hour++) {
            const hourData = completeData[hour];
            if (hourData && hourData[balloon.index] && hourData[balloon.index].length > 1) {
                trajectory.push({
                    data: hourData[balloon.index],
                    hour
                });
            }
        }
        
        if (trajectory.length > 0) {
            trajectories.push({
                path: trajectory
            });
        }
    });

    // console.log("Trajectories: ", trajectories);
    return trajectories;
};

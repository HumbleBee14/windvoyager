// Function to clean and validate balloon data
function cleanBalloonData(data, hoursAgo) {
    if (typeof data === "string") {
      try {
        // Replace 'NaN' with 'null' to allow JSON parsing
        let sanitizedDataString = data.replace(/NaN/g, "null");
  
        // Fix missing brackets
        if (!sanitizedDataString.startsWith("[")) sanitizedDataString = `[${sanitizedDataString}`;
        if (!sanitizedDataString.endsWith("]")) sanitizedDataString = `${sanitizedDataString}]`;
  
        // Parse the cleaned-up data
        data = JSON.parse(sanitizedDataString);
      } catch (error) {
        console.error(`Corrupted JSON at ${hoursAgo}H - Cannot fix:`, error.message);
        return []; // Ignore completely corrupted data
      }
    }
  
    // -------------------------------------------------
  
    if (!Array.isArray(data)) {
      console.warn(`Unexpected data format at ${hoursAgo}H - Ignoring dataset.`);
      return [];
    }
  
    // Ensure the structure is correct (wrap missing outer brackets)
    if (data.length > 0 && !Array.isArray(data[0])) {
      data = [data];
    }
    // -------------------------------------------------
  
    // now we will replace invalid records with `[NaN]`
    const cleanedData = data.map((record) => {
      const isValid = record.every((value) => value !== null && !isNaN(value));
  
      // NEW BugFix: If valid, but the record is (0,0,0), treat it as missing (null)
      const isZeroCoordinates = record.length === 3 && record[0] === 0 && record[1] === 0 && record[2] === 0;
  
      return isValid && !isZeroCoordinates ? record : [NaN];
    });
  
    // console.log(`Hour ${hoursAgo}: Cleaned dataset contains ${cleanedData.length} records.`);
    return cleanedData;
  }

  export { cleanBalloonData };
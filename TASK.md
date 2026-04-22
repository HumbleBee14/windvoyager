Assignment:



Your job is to develop a downloader of GFS data. GFS is the forecast model developed by NOAA that we use for a variety of tasks internally, most importantly, to predict which way the balloons will go in the next few days, in order to:

• Navigate them to places where we want to collect data.

• Know when they are at risk of being taken down by bad weather.



The dataset comes in "GRIB" files (some archaic file format they like in Colorado), and is updated 4 times a day. For each of these four cycles (started at 0,6, 12, &18 UTC, but coming out ~ 3 - 4 hours after that), we download the forecasts up to 8 days ahead (2-hourly frequency for the first 12 hours, 3-hourly up to 2 days, and 6-hourly after that).

The downloader should pull these files from https://registry.opendata.aws/noaa-gfs-bdp-pds/. In particular, the files look like this https://noaa-gfs-bdp-pds.s3.amazonaws.com/gfs.YYYYMMDD/HH/atmos/ gfs. tHHz.pgrb2.1p00. fFFF. Here FFF is forecast hour (0, 2, 4,..). You want to always be up to date (the latest УУУУММДОНН available, where HH=0,6,12,18 in UTC).



You want to pull all the forecast hours mentioned in the first paragraph, execute a process_file function on the GRIB files and store the processed files in a WBPROC directory (pulled from the environment).

Unfortunately, sometimes the GRIB hasn't finished uploading before they expose the endpoint, in which case we get a corruption error when processing. The full file is usually up there soon(silently, at same url), so in this case, we want to redownload & try again.



There should be a subfolder for the cycle date, and the filename should be the unix timestamp of the forecast hour. You can keep raw files at a WBRAW directory if you need to, but you should delete all files after the cycle is complete (in other words, don't keep old data after you move on to the next dataset).



It is important that there's always a dataset available; if the 2024040312 cycle is still downloading, the 2024040306 should still be available; only delete the latter when the former is fully downloaded and processed.

Feel free to use this as the process-file func to call:


image.png
Things should download and process as fast as possible. It should be resilient and if things break unexpectedly it should recover and keep downloading. For any crucial design choices/ tradeoffs, feel free to explain why you implemented it this way in a brief comment, or in a text/markdown file.


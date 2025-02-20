import React from "react";



export const AboutProject = () => {
    return (
        <div>
            <p>
                <span style={{ color: "#FFA500", fontWeight: "bold" }}>WindVoyager</span> is a real-time <b>weather balloon tracking system</b> that visualizes  
                <b>balloon trajectories, wind patterns, and atmospheric conditions</b>.  
                It integrates telemetry data from <a href="https://windbornesystems.com/" target="_blank" rel="noopener noreferrer"><b>WindBorne Systems</b></a> and real-time weather insights from <b>OpenMeteo API </b>  
                to analyze <b>balloon movement, altitude changes, wind velocities, and temperature variations</b>.  
                The project also enables <b>historical trajectory analysis</b> and visualization of missing data points  
                to understand atmospheric trends. While future plans involve <b>predictive modeling</b>,  
                the current focus is on extracting meaningful insights from real-time and past balloon data.  
            </p>



            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <h3>Key Features</h3>
            <ul>
                <li>📍 <b>Real-time balloon tracking</b> on an interactive map.</li>
                <li>🌬 <b>Wind & weather overlay</b> for atmospheric insights.</li>
                <li>📊 <b>Data visualization</b> using charts & graphs.</li>
                <li>📡 <b>Time-zone based balloon tracking</b> for global analysis.</li>
                <li>🎞 <b>Trajectory animation</b> for balloon movements over time.</li>
                <li>🤖 <b>ML-powered predictions</b> for trajectory forecasting & missing data interpolation. (Upcoming)</li>
            </ul>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <h3>How It Works?</h3>
            <ul>
                <li> Fetches <b>real-time balloon positions</b> from <a href="https://windbornesystems.com/" target="_blank" rel="noopener noreferrer">WindBorne Systems</a>.</li>
                <li> Calculates <b>derived metrics</b> including wind vectors, balloon velocity, acceleration, and vertical rates (ascent-descent) using existing telemetry data.</li>
                <li> Retrieves <b>weather data</b> (temperature, pressure and other weather-related data) via <b>OpenMeteo API</b> (Under Development).</li>
                <li> Interpolates <b>missing data points</b> using statistical methods and machine learning algorithms (Future).</li>
                <li> Predicts <b>future balloon movement</b>, altitude changes, and weather conditions using ML model trained on historical inputs and current telemetry.</li>
                <li> Processes & <b>visualizes</b> trajectory paths over time.</li>
            </ul>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <h3>Use Cases</h3>
            <ul>
                <li>🚀 <b>Scientific Research</b> – Understanding wind patterns & high-altitude flights.</li>
                <li>📡 <b>Aerospace & Aviation</b> – Tracking near-space objects.</li>
                <li>📊 <b>Meteorology</b> – Improving weather forecasting models.</li>
            </ul>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <div>
                <p>
                    🔗 <b>GitHub Repository:</b> <a href="https://github.com/HumbleBee14/windvoyager" target="_blank">Github Repository</a>
                    <br />
                    <small style={{color: '#FFA07A'}}>Note: Repository is currently private due to active application period for project submission. Will be made public once completed.</small>
                </p>
                
                <img 
                    src="https://res.cloudinary.com/dqrndttrt/image/upload/v1740028940/Windvoyager_Repo_qxjo7u.png" 
                    alt="WindVoyager GitHub Repository"
                    style={{
                        width: '100%',
                        maxWidth: '800px',
                        height: 'auto',
                        margin: '1rem auto',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2), 0 0 15px rgba(255, 217, 0, 0.94)'
                    }}
                />

            </div>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />


        </div>
    );
};


export const AboutMe = () => {
    return (
        <div>
            <p>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FFA500" }}>
                    Hey there! I'm Dinesh 👋, MSCS student @ Georgia Tech.
                </span>
            </p>

            <p>
                Passionate about <b>software development</b>, system design, and <b>problem-solving</b>.  
                What excites me the most is the process of <b>building things</b> - transforming ideas into real-world solutions using technology.  
                I enjoy learning about new <b>technologies</b>, <b>software development trends</b>, and <b>emerging innovations</b>,  
                constantly exploring what’s possible and how technology can push boundaries.  
            </p>

            <p>
                Currently, here I am working on this project - <b>WindVoyager</b>, a real-time <b>weather balloon tracking system</b>  
                that integrates telemetry data from <b>WindBorne Systems</b> and <b>OpenMeteo API</b> for weather analytics.  
                Through this project, I am exploring <b>how atmospheric sensor data</b> collected over time by weather balloons  
                can be analyzed to extract meaningful insights - whether for <b>weather forecasting</b>,  
                understanding <b>wind patterns</b>, or identifying potential trends in atmospheric conditions.  
                I am continuously experimenting with different approaches to see what valuable information  
                can be derived from this dataset, along with integrating additional data from external APIs.
            </p>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <h3>Education</h3>
            <ul>
                <li><span style={{ display: 'inline-block', width: '120px' }}><b>Undergraduate:</b></span> Bachelor's in Electronics and Communication Engineering (ECE).</li>
                <li><span style={{ display: 'inline-block', width: '90px' }}><b>Graduate:</b></span> MSCS @ Georgia Tech [Dual specialization in Computing Systems and Machine Learning] (In-Progress)</li>
            </ul>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <h3>Work Experience</h3>
            <ul>
                <li><b>Prior Work:</b> Experience in backend software development, using <b>Java (Spring Boot)</b>, <b>Node.js (Express.js), Python</b>.</li>
                <li><b>More details on <a href="https://www.linkedin.com/in/dineshyd/" target="_blank">Linkedin</a></b></li>
            </ul>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            {/* <h3>Tech Stack</h3>
            <ul>
                <li>🔧 <b>Languages:</b> Java (Advanced), Python (Intermediate), Node.js/JavaScript, C++ (Basic)</li>
                <li>💾 <b>Databases:</b> MySQL, PostgreSQL, MongoDB</li>
            </ul> */}

            <h3>Profiles & Links</h3>
            <ul>
                <li>💼 <b>LinkedIn:</b> <a href="https://www.linkedin.com/in/dineshyd/" target="_blank">https://www.linkedin.com/in/dineshyd/</a></li>
                <li>👨‍💻 <b>GitHub:</b> <a href="https://github.com/HumbleBee14" target="_blank">https://github.com/HumbleBee14</a></li>
                <li>✍ <b>Medium:</b> <a href="https://medium.com/@humble_bee" target="_blank">https://medium.com/@humble_bee</a></li>
                <li>🌎 <b>Portfolio:</b> <a href="https://dineshyd.vercel.app" target="_blank">https://dineshyd.vercel.app</a></li>
                <li>📝 <b>Blogging Platform (Project):</b> <a href="https://grepguru.com" target="_blank">https://grepguru.com</a></li>
                <li>🎈⚡ <b>Windvoyager:</b> <a href="https://windvoyager.grepguru.com" target="_blank">https://windvoyager.grepguru.com</a></li>
            </ul>
        </div>
    );
};

export const CurrentWork = ({ milestones }) => {
    return (
        <div>
            <p>
                Implemented <b>real-time weather balloon tracking</b>, interactive maps, and 
                visualized trajectory paths. Integrated <b>React, Leaflet.js, and 
                Recharts</b> for data visualization.
            </p>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <h3>Development Phases</h3>
            <ul>
                <li><span style={{color: '#4CAF50'}}><b>Phase 1</b></span> - MVP: Extract real-time balloon data and plot trajectories.✅ </li>
                <li><span style={{color: '#8BC34A'}}><b>Phase 1.5</b></span> - Visualization: Display trajectory paths on Leaflet maps.✅</li>
                <li><span style={{color: '#2196F3'}}><b>Phase 2</b></span> - Derived Insights: Compute wind vectors, velocity, ascent/descent rates.✅</li>
                <li><span style={{color: '#00BCD4'}}><b>Phase 2.25</b></span> - Time-Zone Analysis & Animation: Filter and animate balloon movements based on time zones.✅</li>
                <li><span style={{color: '#03A9F4'}}><b>Phase 2.5</b></span> - Weather Integration: Fetch weather data (temperature, wind speed, direction) via OpenMeteo API. Added Heatmap visualization for temperature variations.✅</li>
                <li><span style={{color: '#FF1493'}}><b>Phase 3</b></span> - ML & Predictions <b>[Upcoming Plans]</b>: 
                    <ul>
                        <li>Use <b>Machine Learning (LSTM, Kalman Filters)</b> to predict future balloon positions.</li>
                        <li>Interpolate <b>missing trajectory points</b> based on historical movement data.</li>
                        <li>Analyze <b>constellation-wide balloon movement trends</b> for deeper insights.</li>
                    </ul>
                </li>
            </ul>

            <div style={{ 
                width: '80%', 
                margin: '2rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />


            <h3>Development Milestones (Git Commits)</h3>
            <div className="milestone-list">
                {milestones.map((milestone, index) => (
                    <div key={index} className="milestone-item">
                        <a href={`https://github.com/HumbleBee14/windvoyager/commit/${milestone.commitHash}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="commit-link">
                            <div className="milestone-info">
                                <h4>{milestone.title}</h4>
                                {/* <p>{milestone.description}</p> */}
                                {/* <span className="commit-hash">{milestone.commitHash}</span> */}
                            </div>
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Features = ({ features }) => {
    return (
        <div className="features-grid">
            <div style={{ 
                width: '80%', 
                margin: '1rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            {features.map((feature, index) => (
                <div key={index} className="feature-card">

                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>

                    <img 
                        src={feature.image}
                        alt={feature.title}
                        style={{
                            width: '100%',
                            maxWidth: '800px',
                            height: 'auto',
                            margin: '1rem auto',
                            borderRadius: '8px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2), 0 0 15px rgba(255, 217, 0, 0.94)'
                        }}
                    />

                    <div style={{ 
                        width: '80%', 
                        margin: '0rem auto', 
                        borderBottom: '1px solid rgba(57, 149, 255, 0.91)' 
                    }} />

                </div>
            ))}
        </div>
    );
};

export const FuturePlans = () => {
    return (
        <div>
            <div style={{ 
                width: '80%', 
                margin: '1rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

<div style={{
    padding: "15px",
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: "15px",
    border: "2px solid #FFD700",  // Gold/yellow border
    boxShadow: "0px 0px 15px rgba(255, 215, 0, 0.8)"  // Soft yellow glow
}}>
    <p>⚠ <b>Important Note:</b> While I have these ideas in mind, they are <b>highly exploratory</b>, requiring extensive research, testing, and adaptation.  
    Machine learning is a vast field, and as a newcomer, the learning curve will be steep, but that's what makes it exciting! Isn't?</p>

    <p>Given my <b>current academic workload</b>, progress might slow down temporarily,  
    but I'm committed to exploring these areas as part of my own learning journey.  
    Having invested significant time and effort into this project, I'm eager to see what insights  
    can be uncovered from this data.</p>
</div>


            <p>
                Moving forward, I plan to implement:
            </p>
            <ul>
                <li>🤖 <b>ML-based Predictions:</b> Forecast balloon movement using LSTMs/Kalman Filters.</li>
                <li>🔍 <b>Missing Data Interpolation:</b> Use historical movement patterns to estimate missing trajectory points.</li>
                <li>🌍 <b>Constellation-Wide Insights:</b> Analyze large-scale trends from all tracked balloons.</li>
                {/* <li>📈 <b>Advanced Analytics:</b> Extract patterns from 24-hour balloon movement data.</li> */}
                <li>📊 <b>Regression Models:</b> Predict future temperature and wind patterns based on historical data.</li>
                <li>⚡ <b>Probabilistic Forecasting:</b> Introduce confidence intervals for predicted weather conditions.</li>
                <li>🌪 <b>Extreme Weather Event Predictions:</b> Analyze trends to detect potential storms or turbulence zones.</li>
            </ul>
        </div>
    );
};

export const ChallengesFaced = () => {
    return (
        <div>
            <div style={{ 
                width: '80%', 
                margin: '1rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <ul style={{ 
                paddingLeft: '20px', 
                lineHeight: '1.6', 
                fontSize: '16px',
                color: '#ddd'
            }}>
                <li><b>Choosing the right tech stack</b> between Python vs JavaScript for backend/frontend, balancing ML potential with fast development.</li>
                <li><b>Handling corrupted JSON & malformed API responses</b> from WindBorne API, requiring custom sanitization & logging.</li>
                <li><b>Understanding the dataset</b>: Realizing it’s not a sequential time-series problem but a constellation-based hourly dataset with missing gaps.</li>
                <li><b>Handling missing/skipped timestamps</b> across backend data, visualization, and analytics to maintain accurate trajectory insights.</li>
                <li><b>Optimizing frontend performance</b>: Keeping components lightweight, minimizing API calls, and reducing unnecessary data processing.</li>
                <li><b>Computing wind vectors & grid interpolation</b> with limited dataset & documentation - took extensive trial and error to get wind layer working.</li>
                <li><b>Mapping OpenMeteo timestamps</b> correctly to align with our system's 0H-based structure for accurate balloon movement tracking.</li>
                <li><b>Handling imprecise latitude/longitude mappings</b> from OpenMeteo API, which returned approximate points, causing mismatches in temperature data.</li>
                <li><b>Realistic heatmap visualization</b> despite sparse and scattered temperature data-ensuring meaningful spatial representation.</li>
                <li><b>Extracting insights from minimal dataset</b>, requiring thoughtful estimation, interpolation, and predictive modeling strategies.</li>
            </ul>
        </div>
    );
};


export const TechnologiesUsed = () => {
    return (
        
        <ul>
            <div style={{ 
                width: '80%', 
                margin: '1rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <li><b>Frontend:</b> React, Leaflet.js (Map), Recharts (Plots), Turf.js (Spatial analysis)</li>
            <li><b>Backend:</b> Node.js (Express), OpenMeteo (Weather API)</li>
            <li><b>Platform:</b> Backend Hosted on AWS EC2 instance, Frontend application hosted on Cloudflare.</li>

            <div style={{ 
                width: '80%', 
                margin: '1rem auto', 
                borderBottom: '1px solid rgba(205, 85, 15, 0.91)' 
            }} />

            <li><u><b>References & Learning Resources:</b></u></li>
            <ul>
                <li><a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer">OpenMeteo API Docs</a> - Used for fetching weather and wind data.</li>
                <li><a href="https://github.com/Leaflet/Leaflet" target="_blank" rel="noopener noreferrer">Leaflet.js GitHub</a> - Documentation & troubleshooting map rendering.</li>
                <li><a href="https://github.com/danwild/leaflet-velocity" target="_blank" rel="noopener noreferrer">Leaflet Velocity Plugin</a> - Used for rendering wind vectors.</li>
                <li><a href="https://recharts.org/en-US" target="_blank" rel="noopener noreferrer">Recharts Library</a> - For creating flight analytics charts.</li>
                <li><a href="https://turfjs.org/" target="_blank" rel="noopener noreferrer">Turf.js</a> - Used for geospatial calculations (distance, trajectory smoothing).</li>
                <li><a href="https://www.climate.gov/maps-data/datasets" target="_blank" rel="noopener noreferrer">Climate Data Sources</a> - Used as a reference for future ML-based predictions.</li>
                <li><a href="https://www.geographyrealm.com/latitude-longitude/" target="_blank" rel="noopener noreferrer">Understanding Latitude & Longitude</a> - Detailed explanation of geographic coordinates.</li>
                <li><a href="https://www.spatialanalysisonline.com/HTML/radial_basis_and_spline_functi.htm" target="_blank" rel="noopener noreferrer">Radial Basis Function Interpolation</a> - Understanding RBF interpolation for generating structured wind grid data.</li>
                <li><a href="https://wlog.viltstigen.se/articles/2021/11/08/visualizing-wind-using-leaflet/" target="_blank" rel="noopener noreferrer">Visualizing Wind with Leaflet</a> - Guide on implementing wind visualization using Leaflet and velocity layers.</li>
                <li>Many more...</li>
                </ul>
        </ul>


    );
};

export const LessonsLearned = () => {
    return (
        <p>
            - <b>Efficient data handling</b> is critical for real-time visualization.<br />
            - <b>State management & optimization</b> improves UI responsiveness.<br />
            - <b>Modular design</b> makes future expansion easier.
        </p>
    );
};

import React from "react";



export const AboutProject = () => {
    return (
        <div>
            <p>
                <b>WindVoyager</b> is a real-time <b>weather balloon tracking system</b> that visualizes 
                <b> balloon trajectories, wind patterns, and atmospheric conditions</b>. 
                It integrates real-time <b>weather APIs</b>, historical flight data, and <b>machine learning </b> 
                for <b> trajectory predictions</b>.
            </p>

            <h3>Key Features</h3>
            <ul>
                <li>📍 <b>Real-time balloon tracking</b> on an interactive map.</li>
                <li>🌬 <b>Wind & weather overlay</b> for atmospheric insights.</li>
                <li>📊 <b>Data visualization</b> using charts & graphs.</li>
                <li>🤖 <b>ML-powered predictions</b> for trajectory forecasting.</li>
            </ul>

            <h3>How It Works?</h3>
            <ul>
                <li> Fetches <b>real-time balloon positions</b> from WindBorne Systems.</li>
                <li> Retrieves <b>weather data</b> (temperature, pressure, wind speed) via <b>OpenMeteo API</b> (Under Development).</li>
                <li> Processes & <b>visualizes</b> trajectory paths over time.</li>
                <li>Uses <b>ML models</b> (future) to predict balloon movement.</li>
            </ul>

            <h3>Use Cases</h3>
            <ul>
                <li>🚀 <b>Scientific Research</b> – Understanding wind patterns & high-altitude flights.</li>
                <li>📡 <b>Aerospace & Aviation</b> – Tracking near-space objects.</li>
                <li>📊 <b>Meteorology</b> – Improving weather forecasting models.</li>
            </ul>
        </div>
    );
};


export const AboutMe = () => {
    return (
        <div>
            <p>
                Passionate about <b>software development</b>, <b>system design</b>, and <b>problem-solving</b>.  
                I love building systems that solve real-world challenges efficiently.  
                Currently, I am working on <b>WindVoyager</b>, a real-time <b>weather balloon tracking system </b>  
                that integrates <b>OpenMeteo API</b> for weather analytics and ML-based trajectory predictions.
            </p>

            <h3>Education</h3>
            <ul>
                <li><b>Undergraduate:</b> Bachelor's in Electronics and Communication Engineering.</li>
                <li><b>Graduate (Current):</b> MSCS @ Georgia Tech [Dual specialization in Computing Systems and Machine Learning]</li>
            </ul>

            <h3>Work Experience</h3>
            <ul>
                <li><b>Prior Work:</b> Experience in <b>backend development</b>, using <b>Java (Spring Boot)</b> and <b>Node.js (Express.js)</b>.</li>
                {/* <li><b>Key Contributions:</b> Built <b>scalable APIs</b>, microservices.</li> */}
            </ul>

            {/* <h3>Tech Stack</h3>
            <ul>
                <li>🔧 <b>Languages:</b> Java (Advanced), Python (Intermediate), Node.js/JavaScript, C++ (Basic)</li>
                <li>💾 <b>Databases:</b> MySQL, PostgreSQL, MongoDB</li>
            </ul> */}

            <h3>Profiles & Links</h3>
            <ul>
                
                <li>💼 <b>LinkedIn:</b> <a href="#" target="_blank">https://www.linkedin.com/in/dineshyd/</a></li>
                <li>👨‍💻 <b>GitHub:</b> <a href="#" target="_blank">https://github.com/HumbleBee14</a></li>
                <li>✍ <b>Medium:</b> <a href="#" target="_blank">https://medium.com/@humble_bee</a></li>
                <li>🌎 <b>Portfolio:</b> <a href="#" target="_blank">https://dineshyd.vercel.app</a></li>
            </ul>
        </div>
    );
};

export const CurrentWork = ({ milestones }) => {
    return (
        <div>
            <p>
                Implemented <b>real-time balloon tracking</b>, interactive maps, and 
                visualized trajectory paths. Integrated <b>React, Leaflet.js, and 
                Recharts</b> for data visualization.
            </p>
            <h3>Development Milestones</h3>
            <div className="milestone-list">
                {milestones.map((milestone, index) => (
                    <div key={index} className="milestone-item">
                        <a href={`https://github.com/HumbleBee14/windvoyager/commit/${milestone.commitHash}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="commit-link">
                            <div className="milestone-info">
                                <h4>{milestone.title}</h4>
                                <p>{milestone.description}</p>
                                <span className="commit-hash">{milestone.commitHash}</span>
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
            {features.map((feature, index) => (
                <div key={index} className="feature-card">
                    <img src={feature.image} alt={feature.title} />
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                </div>
            ))}
        </div>
    );
};

export const FuturePlans = () => {
    return (
        <p>
            Next, I plan to integrate <b>OpenMeteo API</b> for weather data, 
            enhance <b>ML-based predictions</b>, and refine UI/UX for better analytics.
        </p>
    );
};

export const ChallengesFaced = () => {
    return (
        <p>
            - Handling <b>missing data points</b> and corrupted JSON. <br />
            - Managing <b>large datasets efficiently</b> for real-time tracking. <br />
            - Synchronizing <b>frontend & backend performance optimizations</b>.
        </p>
    );
};

export const TechnologiesUsed = () => {
    return (
        <ul>
            <li><b>Frontend:</b> React, Leaflet.js (Map), Recharts (Plots), Turf.js (Spatial analysis)</li>
            <li><b>Backend:</b> Node.js (Express), OpenMeteo API</li>
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

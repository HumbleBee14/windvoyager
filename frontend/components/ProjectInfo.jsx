import React, { useState, useEffect } from "react";
import {
    AboutProject,
    AboutMe,
    CurrentWork,
    Features,
    FuturePlans,
    ChallengesFaced,
    TechnologiesUsed,
    LessonsLearned
} from "./subcomponents/ProjectSections"; // Import sections

import "./styles/ProjectInfo.css";

const ProjectInfo = ({ onClose }) => {
    const [activeSection, setActiveSection] = useState("aboutProject");
    const [milestones, setMilestones] = useState([]);
    const [features, setFeatures] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [milestonesResponse, featuresResponse] = await Promise.all([
                    fetch('/data/milestones.json'),
                    fetch('/data/features.json')
                ]);
                
                const milestonesData = await milestonesResponse.json();
                const featuresData = await featuresResponse.json();
                
                setMilestones(milestonesData.milestones);
                setFeatures(featuresData.features);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
    
        fetchData();
    }, []);

    const sections = {
        aboutProject: { title: "Project Details", content: <AboutProject /> },
        about: { title: "About Me", content: <AboutMe /> },
        work: { title: "Current Work", content: <CurrentWork milestones={milestones} /> },
        features: { title: "Features", content: <Features features={features} /> },
        future: { title: "Future Plans", content: <FuturePlans /> },
        challenges: { title: "Challenges Faced", content: <ChallengesFaced /> },
        tech: { title: "Technologies Used", content: <TechnologiesUsed /> },
        lessons: { title: "Lessons Learned", content: <LessonsLearned /> },
    };

    // -------------------------------------------------------------------

    return (
        <div className="project-container">
            <div className="sidebar">
                {Object.keys(sections).map((key) => (
                    <button
                        key={key}
                        className={`sidebar-btn ${activeSection === key ? "active" : ""}`}
                        onClick={() => setActiveSection(key)}
                    >
                        {sections[key].title}
                    </button>
                ))}
            </div>

            <div className="content">
                <h2>{sections[activeSection].title}</h2>
                {sections[activeSection].content}
            </div>

            <button className="close-btn" onClick={onClose}>✖ Close</button>
        </div>
    );
};

export default ProjectInfo;

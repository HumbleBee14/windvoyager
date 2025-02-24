import numpy as np

# Define initial state (latitude, longitude, altitude, velocity, wind speed, temperature)
X = np.array([[0],   # Latitude
              [0],   # Longitude
              [10000],  # Altitude in meters
              [50],  # Velocity in m/s
              [30],  # Wind Speed
              [20]]) # Temperature in Celsius

# Define State Transition Matrix (F)
dt = 3600  # Time step (1 hour)
F = np.array([[1, 0, 0, dt, 0, 0],  
              [0, 1, 0, 0, dt, 0],  
              [0, 0, 1, 0, 0, dt],  
              [0, 0, 0, 1, 0, 0],  
              [0, 0, 0, 0, 1, 0],  
              [0, 0, 0, 0, 0, 1]])  

# Define Control Input Matrix (B)
B = np.array([[0],  
              [0],  
              [0],  
              [1],  
              [0],  
              [0]])  

# Define Observation Matrix (H) - We only observe lat, lon, alt, velocity
H = np.array([[1, 0, 0, 0, 0, 0],  
              [0, 1, 0, 0, 0, 0],  
              [0, 0, 1, 0, 0, 0],  
              [0, 0, 0, 1, 0, 0]])  

# Process Noise Covariance (Q)
Q = np.eye(6) * 0.01  

# Measurement Noise Covariance (R)
R = np.eye(4) * 5  

# Initial Estimate Error Covariance (P)
P = np.eye(6) * 1  

print("Kalman Filter Initialized")

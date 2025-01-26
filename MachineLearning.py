#!/usr/bin/env python
# coding: utf-8

# In[3]:


conda install -c conda-forge neo4j-python-driver


# In[ ]:





# In[23]:


import pandas as pd
import numpy as np
from neo4j import GraphDatabase

# Neo4j connection details
URI = "neo4j+s://3f9444f0.databases.neo4j.io"
AUTH = ("neo4j", "iq3CmW-zDLCjA4fr_399w5hmNFEwH6ehzVQDZCcvQYs")

# Query to fetch data from Neo4j
query = """
MATCH (start)-[r:ROUTE]->(end)
RETURN start.id AS source, end.id AS destination,
       r.co2Emission AS co2, r.distance AS distance,
       r.moneyCost AS cost, r.timeTaken AS time;
"""

# Connect to Neo4j and fetch data
with GraphDatabase.driver(URI, auth=AUTH) as driver:
    with driver.session() as session:
        result = session.run(query)
        data = [record.data() for record in result]

# Convert to Pandas DataFrame
df = pd.DataFrame(data)

# Fill missing 'source' and 'destination' with random unique IDs
df['source'] = df['source'].apply(lambda x: f"SRC_{np.random.randint(1000, 9999)}" if pd.isna(x) or x == "None" else x)
df['destination'] = df['destination'].apply(lambda x: f"DEST_{np.random.randint(1000, 9999)}" if pd.isna(x) or x == "None" else x)

# Fill missing numerical values with random realistic values
df['cost'] = df['cost'].apply(lambda x: round(np.random.uniform(50, 200), 2) if pd.isna(x) else x)  # Cost between 50-200
df['time'] = df['time'].apply(lambda x: round(np.random.uniform(1, 10), 1) if pd.isna(x) else x)   # Time between 1-10

# Save cleaned data to a CSV file
df.to_csv("cleaned_neo4j_data.csv", index=False)

# Display the first few rows
print(df.head())


# In[24]:


print(df_cleaned.head())


# In[25]:


from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

# Features (X) and Target (y)
X = df[['distance', 'cost', 'time']]
y = df['co2']  # Target: Minimize CO2 Emissions

# Split Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"Model MAE: {mae:.2f} CO₂")


# In[26]:


def predict_best_route(distance, cost, time):
    co2_pred = model.predict([[distance, cost, time]])
    return co2_pred[0]

# Example: Predict CO₂ for a 70km, $150, 2-hour trip
predicted_co2 = predict_best_route(distance=70, cost=150, time=2)
print(f"Predicted CO₂ Emissions: {predicted_co2:.2f}")


# In[29]:


# Define a function to compute the shortest path based on distance
def get_shortest_distance_path():
    query = """
    MATCH (start)-[r:ROUTE]->(end)
    RETURN start.id AS source, end.id AS destination, r.distance AS distance
    ORDER BY r.distance ASC
    LIMIT 1;
    """
    
    # Connect to Neo4j and fetch the shortest path based on distance
    with GraphDatabase.driver(URI, auth=AUTH) as driver:
        with driver.session() as session:
            result = session.run(query)
            shortest_path = [record.data() for record in result]
    
    return shortest_path

# Fetch and display the shortest distance path
shortest_distance_path = get_shortest_distance_path()
shortest_distance_path

print(shortest_distance_path)


# In[ ]:





# In[ ]:





# In[ ]:





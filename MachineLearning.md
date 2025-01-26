```python
conda install -c conda-forge neo4j-python-driver

```

    Collecting package metadata (current_repodata.json): \ WARNING conda.models.version:get_matcher(537): Using .* with relational operator is superfluous and deprecated and will be removed in a future version of conda. Your spec was 1.7.1.*, but conda is ignoring the .* and treating it as 1.7.1
    done
    Solving environment: done
    
    
    ==> WARNING: A newer version of conda exists. <==
      current version: 4.9.2
      latest version: 25.1.0
    
    Please update conda by running
    
        $ conda update -n base -c defaults conda
    
    
    
    ## Package Plan ##
    
      environment location: /opt/anaconda3
    
      added / updated specs:
        - neo4j-python-driver
    
    
    The following packages will be downloaded:
    
        package                    |            build
        ---------------------------|-----------------
        conda-4.14.0               |   py38h50d1736_0        1012 KB  conda-forge
        neo4j-python-driver-5.19.0 |     pyhd8ed1ab_0         138 KB  conda-forge
        python_abi-3.8             |           2_cp38           4 KB  conda-forge
        ------------------------------------------------------------
                                               Total:         1.1 MB
    
    The following NEW packages will be INSTALLED:
    
      neo4j-python-driv~ conda-forge/noarch::neo4j-python-driver-5.19.0-pyhd8ed1ab_0
      python_abi         conda-forge/osx-64::python_abi-3.8-2_cp38
    
    The following packages will be UPDATED:
    
      conda               pkgs/main::conda-4.9.2-py38hecd8cb5_0 --> conda-forge::conda-4.14.0-py38h50d1736_0
    
    
    
    Downloading and Extracting Packages
    conda-4.14.0         | 1012 KB   | ##################################### | 100% 
    python_abi-3.8       | 4 KB      | ##################################### | 100% 
    neo4j-python-driver- | 138 KB    | ##################################### | 100% 
    Preparing transaction: done
    Verifying transaction: done
    Executing transaction: done
    
    Note: you may need to restart the kernel to use updated packages.



```python

```


```python
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

```

         source destination        co2    distance        cost      time
    0  SRC_1082          E1   8.000000   75.000000  120.000000  3.000000
    1  SRC_7598   DEST_2276  39.741434   70.000000   95.686929  4.033696
    2  SRC_9501   DEST_3522  48.304039  109.247237  195.953920  1.115575
    3  SRC_3348   DEST_1933  15.441306   70.000000   84.576114  2.466425
    4  SRC_2064   DEST_6567  44.692370  115.062101   73.174919  4.040443



```python
print(df_cleaned.head())

```

                            source                  destination        co2  \
    20  Factory_391.00555223580693  Warehouse_682.3198694017516  42.985390   
    21  Factory_391.00555223580693  Warehouse_917.4697246794643  48.089201   
    22                    SRC_1234                           E1   8.000000   
    
          distance        cost      time  
    20  148.193477  137.814594  5.793870  
    21  118.646904   58.863040  8.683439  
    22   75.000000   95.375952  3.000000  



```python
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

```

    Model MAE: 12.46 CO₂



```python
def predict_best_route(distance, cost, time):
    co2_pred = model.predict([[distance, cost, time]])
    return co2_pred[0]

# Example: Predict CO₂ for a 70km, $150, 2-hour trip
predicted_co2 = predict_best_route(distance=70, cost=150, time=2)
print(f"Predicted CO₂ Emissions: {predicted_co2:.2f}")

```

    Predicted CO₂ Emissions: 31.22


    /opt/anaconda3/lib/python3.8/site-packages/sklearn/base.py:465: UserWarning: X does not have valid feature names, but RandomForestRegressor was fitted with feature names
      warnings.warn(



```python
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

```

    [{'source': 'Factory_391.00555223580693', 'destination': None, 'distance': 50.34806045589738}]



```python

```


```python

```


```python

```

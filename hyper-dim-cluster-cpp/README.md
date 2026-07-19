# Hyper-Dimensional Clustering Engine

## Overview
This is a high-performance C++ implementation of K-Means clustering designed specifically for hyper-dimensional datasets. It demonstrates the use of C++17 features, standard library random number generators, and efficient coordinate representations for machine learning algorithms.

## Features
- **High-Dimensional Points:** Represents points with an arbitrary number of dimensions.
- **K-Means Algorithm:** Efficient implementation of Lloyd's algorithm for k-means clustering.
- **Randomization:** Uses `std::mt19937` for high-quality random data generation and centroid initialization.
- **Performance Measurement:** Includes timing functionality using `std::chrono` to measure the cost of generation and clustering.

## Usage
To build the project, run:
```bash
make
```

To execute the clustering engine, run:
```bash
./hypercluster
```

## License
This project is licensed under the Apache 2.0 License.

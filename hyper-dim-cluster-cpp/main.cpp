#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <limits>
#include <algorithm>
#include "Point.h"

using namespace std;

// Generate random points in a high-dimensional space
vector<Point> generateRandomPoints(int numPoints, int dimensions) {
    vector<Point> points;
    unsigned seed = chrono::system_clock::now().time_since_epoch().count();
    mt19937 generator(seed);
    uniform_real_distribution<double> distribution(-100.0, 100.0);

    for (int i = 0; i < numPoints; ++i) {
        vector<double> coordinates(dimensions);
        for (int j = 0; j < dimensions; ++j) {
            coordinates[j] = distribution(generator);
        }
        points.emplace_back(i, coordinates);
    }
    return points;
}

// Calculate Euclidean distance between two high-dimensional points
double calculateDistance(const Point& p1, const Point& p2) {
    double sum = 0.0;
    const auto& c1 = p1.getCoordinates();
    const auto& c2 = p2.getCoordinates();
    int dims = c1.size();

    for (int i = 0; i < dims; ++i) {
        double diff = c1[i] - c2[i];
        sum += diff * diff;
    }
    return sqrt(sum);
}

// K-Means Clustering implementation
void kMeansClustering(vector<Point>& points, int k, int maxIterations) {
    int numPoints = points.size();
    if (numPoints == 0) return;
    int dimensions = points[0].getCoordinates().size();

    // 1. Initialize centroids randomly
    vector<Point> centroids;
    unsigned seed = chrono::system_clock::now().time_since_epoch().count();
    mt19937 generator(seed);
    uniform_int_distribution<int> distribution(0, numPoints - 1);

    for (int i = 0; i < k; ++i) {
        centroids.push_back(points[distribution(generator)]);
        centroids[i].setCluster(i);
    }

    bool changed = true;
    int iter = 0;

    while (changed && iter < maxIterations) {
        changed = false;

        // 2. Assign points to nearest centroid
        for (Point& p : points) {
            double minDistance = numeric_limits<double>::max();
            int bestCluster = -1;

            for (int i = 0; i < k; ++i) {
                double dist = calculateDistance(p, centroids[i]);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestCluster = i;
                }
            }

            if (p.getCluster() != bestCluster) {
                p.setCluster(bestCluster);
                changed = true;
            }
        }

        // 3. Update centroids
        vector<vector<double>> newCentroidCoords(k, vector<double>(dimensions, 0.0));
        vector<int> clusterCounts(k, 0);

        for (const Point& p : points) {
            int clusterId = p.getCluster();
            const auto& coords = p.getCoordinates();
            for (int d = 0; d < dimensions; ++d) {
                newCentroidCoords[clusterId][d] += coords[d];
            }
            clusterCounts[clusterId]++;
        }

        for (int i = 0; i < k; ++i) {
            if (clusterCounts[i] > 0) {
                for (int d = 0; d < dimensions; ++d) {
                    newCentroidCoords[i][d] /= clusterCounts[i];
                }
                centroids[i] = Point(-1, newCentroidCoords[i]);
                centroids[i].setCluster(i);
            }
        }

        iter++;
    }

    cout << "K-Means converged after " << iter << " iterations." << endl;
}

int main() {
    int numPoints = 1000;
    int dimensions = 50;
    int k = 5;
    int maxIterations = 100;

    cout << "Hyper-Dimensional Clustering Engine (C++)" << endl;
    cout << "=========================================" << endl;
    cout << "Generating " << numPoints << " points in " << dimensions << "-dimensional space..." << endl;

    auto start = chrono::high_resolution_clock::now();
    vector<Point> points = generateRandomPoints(numPoints, dimensions);
    auto end = chrono::high_resolution_clock::now();
    chrono::duration<double> diff = end - start;
    cout << "Generation took " << diff.count() << " seconds." << endl;

    cout << "Running K-Means Clustering (k=" << k << ")..." << endl;

    start = chrono::high_resolution_clock::now();
    kMeansClustering(points, k, maxIterations);
    end = chrono::high_resolution_clock::now();
    diff = end - start;

    cout << "Clustering took " << diff.count() << " seconds." << endl;

    // Optional: Print a small sample of results
    cout << "\\nSample clustering results:" << endl;
    for (int i = 0; i < 10 && i < numPoints; ++i) {
        cout << "Point " << points[i].getId() << " -> Cluster " << points[i].getCluster() << endl;
    }

    return 0;
}

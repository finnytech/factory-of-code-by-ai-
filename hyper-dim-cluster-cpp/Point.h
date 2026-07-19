#ifndef POINT_H
#define POINT_H

#include <vector>

class Point {
private:
    int id;
    int clusterId;
    std::vector<double> coordinates;

public:
    Point(int id, const std::vector<double>& coords)
        : id(id), clusterId(-1), coordinates(coords) {}

    int getId() const { return id; }

    int getCluster() const { return clusterId; }
    void setCluster(int cluster) { clusterId = cluster; }

    const std::vector<double>& getCoordinates() const { return coordinates; }
};

#endif // POINT_H

#ifndef PLASMA_PARTICLE_H
#define PLASMA_PARTICLE_H

struct Vector3D {
    double x, y, z;

    Vector3D(double _x = 0, double _y = 0, double _z = 0) : x(_x), y(_y), z(_z) {}

    Vector3D operator+(const Vector3D& other) const {
        return Vector3D(x + other.x, y + other.y, z + other.z);
    }
    Vector3D operator-(const Vector3D& other) const {
        return Vector3D(x - other.x, y - other.y, z - other.z);
    }
    Vector3D operator*(double scalar) const {
        return Vector3D(x * scalar, y * scalar, z * scalar);
    }
    Vector3D cross(const Vector3D& other) const {
        return Vector3D(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }
};

class PlasmaParticle {
public:
    double mass;
    double charge;
    Vector3D position;
    Vector3D velocity;

    PlasmaParticle(double m, double q, Vector3D pos, Vector3D vel);

    // Updates velocity and position based on Electric (E) and Magnetic (B) fields
    // over a timestep dt using basic Euler integration.
    void update(const Vector3D& E, const Vector3D& B, double dt);
};

#endif // PLASMA_PARTICLE_H

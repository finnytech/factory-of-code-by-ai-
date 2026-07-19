#include "PlasmaParticle.h"

PlasmaParticle::PlasmaParticle(double m, double q, Vector3D pos, Vector3D vel)
    : mass(m), charge(q), position(pos), velocity(vel) {}

void PlasmaParticle::update(const Vector3D& E, const Vector3D& B, double dt) {
    if (mass == 0) return; // Prevent division by zero

    // Lorentz Force: F = q * (E + v x B)
    Vector3D magnetic_force = velocity.cross(B);
    Vector3D total_force = (E + magnetic_force) * charge;

    // a = F / m
    Vector3D acceleration = total_force * (1.0 / mass);

    // v_new = v + a * dt
    velocity = velocity + acceleration * dt;

    // p_new = p + v_new * dt
    position = position + velocity * dt;
}

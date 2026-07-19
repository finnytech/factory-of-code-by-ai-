#include <iostream>
#include <cassert>
#include <cmath>
#include "PlasmaParticle.h"

bool approx_equal(double a, double b, double epsilon = 1e-5) {
    return std::abs(a - b) < epsilon;
}

void test_electric_field_only() {
    // Particle at rest, mass=1, charge=1
    PlasmaParticle p(1.0, 1.0, Vector3D(0, 0, 0), Vector3D(0, 0, 0));

    // E-field = (1, 0, 0)
    Vector3D E(1.0, 0, 0);
    Vector3D B(0, 0, 0);

    // a = q*E/m = 1*1/1 = 1
    // v = v0 + a*t = 0 + 1*1 = 1
    // pos = pos0 + v*t = 0 + 1*1 = 1
    p.update(E, B, 1.0);

    assert(approx_equal(p.velocity.x, 1.0));
    assert(approx_equal(p.position.x, 1.0));
    std::cout << "Test Electric Field Only: PASS" << std::endl;
}

void test_magnetic_field_only() {
    // Particle moving in +x direction, mass=1, charge=1
    PlasmaParticle p(1.0, 1.0, Vector3D(0, 0, 0), Vector3D(1.0, 0, 0));

    Vector3D E(0, 0, 0);
    // B-field in +z direction
    Vector3D B(0, 0, 1.0);

    // v x B = (1,0,0) x (0,0,1) = (0, -1, 0)
    // F = q * (v x B) = (0, -1, 0)
    // a = (0, -1, 0)
    // v_new = (1, 0, 0) + (0, -1, 0) * dt = (1, -dt, 0)

    double dt = 0.1;
    p.update(E, B, dt);

    assert(approx_equal(p.velocity.x, 1.0));
    assert(approx_equal(p.velocity.y, -0.1));
    std::cout << "Test Magnetic Field Only: PASS" << std::endl;
}

int main() {
    std::cout << "Running Plasma Physics Simulator Tests..." << std::endl;

    test_electric_field_only();
    test_magnetic_field_only();

    std::cout << "All tests passed!" << std::endl;
    return 0;
}

#include <iostream>
#include <vector>
#include "PlasmaParticle.h"

int main() {
    std::cout << "--- Plasma Physics Simulator ---" << std::endl;

    // Simulation parameters
    double dt = 0.01;
    int num_steps = 100;

    // Define Electric and Magnetic fields
    Vector3D E(0, 0, 0); // No electric field
    Vector3D B(0, 0, 1.0); // Constant magnetic field in z direction

    // Initialize particles: (mass, charge, pos, vel)
    std::vector<PlasmaParticle> particles;

    // Electron-like particle
    particles.emplace_back(1.0, -1.0, Vector3D(0, 0, 0), Vector3D(1.0, 0, 0));
    // Proton-like particle
    particles.emplace_back(10.0, 1.0, Vector3D(0, 5.0, 0), Vector3D(1.0, 0, 0));

    std::cout << "Starting simulation with " << particles.size() << " particles." << std::endl;

    for (int step = 0; step < num_steps; ++step) {
        if (step % 20 == 0) {
            std::cout << "Step " << step << ":" << std::endl;
            for (size_t i = 0; i < particles.size(); ++i) {
                const auto& p = particles[i];
                std::cout << "  Particle " << i
                          << " Pos: (" << p.position.x << ", " << p.position.y << ", " << p.position.z << ") "
                          << " Vel: (" << p.velocity.x << ", " << p.velocity.y << ", " << p.velocity.z << ")" << std::endl;
            }
        }

        for (auto& p : particles) {
            p.update(E, B, dt);
        }
    }

    std::cout << "Simulation complete." << std::endl;

    return 0;
}

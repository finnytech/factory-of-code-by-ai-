CXX = g++
CXXFLAGS = -std=c++11 -Wall -Iinclude

SRC = src/PlasmaParticle.cpp src/main.cpp
TEST_SRC = src/PlasmaParticle.cpp tests/test_physics.cpp

OBJ = $(SRC:.cpp=.o)
TEST_OBJ = $(TEST_SRC:.cpp=.o)

TARGET = plasma_sim
TEST_TARGET = test_sim

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJ)

test: $(TEST_TARGET)
	./$(TEST_TARGET)

$(TEST_TARGET): $(TEST_OBJ)
	$(CXX) $(CXXFLAGS) -o $(TEST_TARGET) $(TEST_OBJ)

clean:
	rm -f $(OBJ) $(TEST_OBJ) $(TARGET) $(TEST_TARGET)

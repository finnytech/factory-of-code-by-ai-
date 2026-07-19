CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O3 -pthread

all: hypercluster

hypercluster: main.o
	$(CXX) $(CXXFLAGS) -o hypercluster main.o

main.o: main.cpp Point.h
	$(CXX) $(CXXFLAGS) -c main.cpp

clean:
	rm -f *.o hypercluster

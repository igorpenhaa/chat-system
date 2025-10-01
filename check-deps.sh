#!/bin/bash

HARDDEPS='bash awk getopt /usr/bin/time timeout make cmake bc'

PACKAGES='libprotobuf-dev libgrpc-dev libgrpc++-dev'

COMPILERS='gcc g++ python3 bash node'

MANAGER=""
if command -v dpkg &> /dev/null; then
	MANAGER="dpkg-query -s"
elif command -v rpm &> /dev/null; then
	MANAGER="rpm -q --requires"
else
	echo "Package manager is not dpkg or rpm."
	return 1
fi

err=0
function checkdeps() {
	for arg; do
		if ! which $arg &> /dev/null; then
			echo "$arg"
			((err++))
		fi
	done
	return $err

}

function checkpacks() {
	for arg; do
		if ! $MANAGER "$arg" &> /dev/null; then
			echo "$arg"
			((err++))
		fi
	done
	return $err
}

echo "Checking HARDDEPS"
checkdeps $HARDDEPS && echo 'OK.'

echo
echo 'Checking Compilers/runtime'
checkdeps $COMPILERS && echo 'OK.'

echo
echo 'Checking Packages'
checkpacks $PACKAGES && echo 'OK.'

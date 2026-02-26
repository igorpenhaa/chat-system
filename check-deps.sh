#!/bin/bash

HARDDEPS='bash awk getopt /usr/bin/time timeout make cmake bc'

dpkg_PACKAGES='libprotobuf-dev libgrpc-dev libgrpc++-dev'
rpm_PACKAGES='protobuf-devel grpc-devel'

COMPILERS='gcc g++ python3 bash node'

MANAGER=""
PACKS=""
if command -v dpkg &> /dev/null; then
	MANAGER="dpkg-query -s"
	PACKS=$dpkg_PACKAGES
elif command -v rpm &> /dev/null; then
	MANAGER="rpm -q --requires"
	PACKS=$rpm_PACKAGES
else
	echo "Package manager is not dpkg or rpm."
	exit 1
fi

reterr=0
function checkdeps() {
	local err=0
	for arg; do
		if ! which $arg &> /dev/null; then
			echo "$arg"
			((err++))
		fi
	done
	((reterr += err))
	return $err

}

function checkpacks() {
	local err=0
	for arg; do
		if ! $MANAGER "$arg" &> /dev/null; then
			echo "$arg"
			((err++))
		fi
	done
	((reterr += err))
	return $err
}

echo "Checking HARDDEPS"
checkdeps $HARDDEPS && echo 'OK.'

echo
echo 'Checking Compilers/runtime'
checkdeps $COMPILERS && echo 'OK.'

echo
echo 'Checking Packages'
checkpacks $PACKS && echo 'OK.'

exit $reterr

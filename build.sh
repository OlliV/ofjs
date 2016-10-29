#!/bin/sh -e
mkdir -p build/src
mkdir -p build/lib
mkdir -p build/ofjs_modules
cp -R bin build/
async-to-gen -d build/src/ src/
async-to-gen -d build/lib/ lib/
async-to-gen -d build/ofjs_modules/ ofjs_modules/

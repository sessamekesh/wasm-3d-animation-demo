# WASM 3D Animation Demo

http://aws-website-webassemblyskeletalanimation-ffaza.s3-website-us-east-1.amazonaws.com/

A couple of disclaimers, before starting:

1. This is one example of what WebAssembly can be used for, but you should check out https://github.com/shamadee/wasm-init also. It's a fantastic example, IMO.
2. Compiling this requires Emscripten. As of writing this code, it requires the incoming branch. See instructions below.
3. Assets are not included, because I do not have re-distribution rights on them.
  * If you want to provide some I can use in this repo, send a PR. FBX, Blend, textured or materials only, I'll make it work.
  * I need one walking animation, and at least one distinct dance animation (I used three in development)
  * If you're taking requests, plz do Danny Avidan of the Game Grumps :heart:
4. I didn't intend to release the code when I started this project, so I apologize that the animation code itself isn't documented better for learning how it works.

## Setup Emscripten
```
git clone https://github.com/juj/emsdk.git
cd emsdk
./emsdk install sdk-incoming-64bit binaryen-master-64bit
./emsdk activate sdk-incoming-64bit binaryen-master-64bit
```
Run `source ./emsdk_env` in the terminal you use for your builds to get the right `emcc` command.

## What is this?

This is a _simple_ character animation system, implemented with nearly\* identical logic in both JavaScript (well, TypeScript) and WebAssembly (from C++).
It uses [skeletal animation](https://en.wikipedia.org/wiki/Skeletal_animation) to animate multiple instances of a character across the screen,
starting in the background and moving gradually towards the foreground, before respawning in the back.

The user can configure via a menu in the upper-right (1) which animation system is being used (default: JavaScript) and (2) how many characters are on the screen at any time.
On my PC (third-gen i3 CPU, GTX 980 Ti GPU) using 15 characters gave me around 5-10 FPS using the JavaScript implementation, and an easy
60 FPS using the WebAssembly implementation.

* WebGL is used to power the 3D graphics.
* The math code I use was _heavily_ inspired (aka shamelessly copied from) [gl-matrix](https://github.com/toji/gl-matrix)
* WebAssembly support is [required in your browser](https://caniuse.com/#feat=wasm).

\* As "nearly identical" as JavaScript and C++ can be - the classes are the same.

## Why skeletal animation?

I absolutely wanted to do some kind of 3D graphics demo. They're cool, I'm a nerd for game programming stuff, and the difference between frames taking 15ms to render (60FPS) and 100ms to render(10FPS) is _much_ more apparent than the same time difference when attached to a button press or mouse click.

That being decided, I decided to pick something CPU-bound, which would give me room to optimize the most significant bottleneck.

I considered a few different kinds of demos, but then I remembered how hilarious bugs are when working on skeletal animation systems, and my decision was made :smile:

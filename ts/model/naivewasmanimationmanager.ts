import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

import {Vec3} from '../math/vec3';
import {Mat4} from '../math/mat4';
import {Quaternion} from '../math/quaternion';

// Size of primitives
const UINT_SIZE = 4;
const FLOAT_SIZE = 4;
const MAT4_SIZE = 16 * FLOAT_SIZE;
const STATIC_BONE_SIZE = 2 * UINT_SIZE + MAT4_SIZE;
const VEC3_SIZE = 3 * FLOAT_SIZE;
const QUAT_SIZE = 4 * FLOAT_SIZE;
const ANIMATED_BONE_SIZE = UINT_SIZE * 7;
const POSITION_KEYFRAME_SIZE = FLOAT_SIZE + VEC3_SIZE;
const ROTATION_KEYFRAME_SIZE = FLOAT_SIZE + QUAT_SIZE;
const SCALING_KEYFRAME_SIZE = FLOAT_SIZE + VEC3_SIZE;

const errCodes: Map<number, string> = new Map();
errCodes.set(0, 'Nullptr');
errCodes.set(1, 'DebugMsg');
errCodes.set(2, 'ValueNotFound');

/**
 * Follow the same logic as the NaiveJSAnimationManager, but in a WASM module.
 * Notice: Resting memory here will not be zero, because the structs (ModelData, AnimationData) will be
 *  copied to the WASM heap. This is to prevent expensive copies from happening every frame - I want to
 *  simulate a self-contained module here, not just a workhorse for math operations.
 * If I copy memory over every frame, I suspect (haven't actually checked) that the memory cost will swallow
 *  up any benefits of using WASM.
 */
export class NaiveWASMAnimationManager extends AnimationManager {
    private wasmModule: WASMModule|null = null;
    private exports: any = null;
    private memory: WebAssembly.Memory|null = null;

    // Keep a pointer to the next available heap memory
    // In compilation C++ -> WASM, I noticed that what would be expected to be stack allocations
    //  were being treated as such - e.g.:
    // 
    // int a;
    // int b; // &b = &a + sizeof(int)
    //
    // However, when memory was then written, it was being written to the same heap memory
    //  contained in this.memory. To mitigate this problem, I've given the WASM code a 1MB "stack".
    //  of heap memory that will not be addressed with this JS malloc implementation.
    // This is not a general purpose solution, and will NOT fail gracefully in the case of a stack overflow!
    // Fun fact: googling "webassembly stack overflow" is exceptionally not helpful.
    private nextMemoryOpen: number = 1024 * 1024; // Where is the next available memory chunk? Notice my paranoia at not starting at 0 ;-)

    constructor() { super(); this.boneIds.set('RootNode', 0); this.nextBoneId = 1; }

    private nextBoneId: number = 0;
    private boneIds: Map<string, number> = new Map();

    private animationAddresses: Map<Animation, number> = new Map();
    private modelAddresses: Map<ModelData, number> = new Map();

    public load() {
        return fetch('naive.wasm')
            .then((response) => response.arrayBuffer())
            .then((bytes) => WebAssembly.compile(bytes))
            .then((wasmModule: WASMModule) => {
                this.memory = new WebAssembly.Memory({ initial: 512 });
                const imports = {
                    env: {
                        memoryBase: 0,
                        tableBase: 0,
                        memory: this.memory,
                        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),

                        _acosf: Math.acos,
                        _sinf: Math.sin,
                        _fmodf: (a: number, b: number) => { return a % b; },
                        _alertError: (code: number, line: number, extra: number) => {
                            debugger;
                            console.error(errCodes.get(code) || '', ' ON LINE ', line, ' EXTRA:: ', extra);
                        }
                    }
                };

                return WebAssembly.instantiate(wasmModule, imports);
            })
            .then((wasmModule) => {
                this.wasmModule = wasmModule;
                this.exports = this.wasmModule.exports;
                (<any>window).wasm = this.wasmModule.exports;
                return true;
            })
            .catch((err) => {
                console.error('Failed to load naive WASM module!', err);
                return false;
            });
    }
    public registerAnimation(animation: Animation): void {
        if (!this.memory) {
            console.error('Could not register animation with naive WASM system, because system is not loaded yet!');
            return;
        }

        
        this.registerBones(animation);
        let pAnimationAddress = this.createAnimationData(animation);
        this.animationAddresses.set(animation, pAnimationAddress);
    }
    public registerModel(model: ModelData): void {
        if (!this.memory) {
            console.error('Could not register animation with naive WASM system, because system is not loaded yet!');
            return;
        }

        if (this.modelAddresses.has(model)) {
            console.warn('Model already registered in system, will not duplicate');
            return;
        }

        
        let pModelAddress = this.createModelData(model);
        this.modelAddresses.set(model, pModelAddress);
    }
    public associateModelAndAnimation(animation: Animation, model: ModelData): boolean {
        // Since this is initialization-time, we can do this in JavaScript exclusively
        for (var i = 0; i < model.boneNames.length; i++) {
            var name = model.boneNames[i];
            // TODO SESS: Is it necessary to check both? All of them _should_ be in the static bones...
            if (!(animation.staticBones.has(name) || animation.animatedBones.has(name))) {
                console.warn('ASSOCIATION FALIED: Bone', name, 'in model', model, 'missing from animation', animation);
                return false;
            }
        }

        return true;
    }
    public getSingleAnimation(animation: Animation, model: ModelData, animationTime: number): AnimationResult {
        var me = this; // EWWWWW GROSS GET RID OF IT
        // TODO KAM: Debug why this is breaking. After we see why it breaks, we can start hunting down logic errors.

        if (!this.memory || !this.exports) {
            console.error('Could not register animation with naive WASM system, because system is not loaded yet!');
            return new AnimationResult(new Float32Array([]), 0);
        }

        if (!this.animationAddresses.has(animation)) {
            console.error('Unregistered animation');
            return new AnimationResult(new Float32Array([]), 0);
        }

        if (!this.modelAddresses.has(model)) {
            console.error('Unregistered model');
            return new AnimationResult(new Float32Array([]), 0);
        }

        let rsl = new Float32Array(this.memory.buffer, this.nextMemoryOpen, MAT4_SIZE);
        this.exports._getSingleAnimation(this.nextMemoryOpen, this.animationAddresses.get(animation), this.modelAddresses.get(model), animationTime);

        return new AnimationResult(
            rsl, 0 // TODO SESS: What actually is the extra memory usage?
        );
    }
    public getBlendedAnimation(animations: [Animation, Animation], model: ModelData, animationTimes: [number, number], blendFactor: number): AnimationResult {
        // TODO SESS: Not this.
        return this.getSingleAnimation(animations[0], model, animationTimes[0]);
    }
    public getRestingMemoryUsage(): number {
        return this.nextMemoryOpen; // How much extra memory for copying everything over to c structures?
    }

    //
    // Helpers
    //
    protected malloc(length: number): number {
        var ptr = this.nextMemoryOpen;
        this.nextMemoryOpen += length;
        return ptr;
    }

    private createModelData(model: ModelData): number {
        if (!this.memory) {
            debugger;
            console.error('Could not serialize model data, WASM module not initialized');
            return 0;
        }

        var pModelData = this.malloc(UINT_SIZE * 3);
        var uintView = new Uint32Array(this.memory.buffer, pModelData, UINT_SIZE * 3);

        uintView[0] = model.boneNames.length;

        // set boneIds array
        var pBoneIds = this.malloc(model.boneNames.length * UINT_SIZE);
        var boneView = new Uint32Array(this.memory.buffer, pBoneIds, model.boneNames.length * UINT_SIZE);
        for (let idx = 0; idx < model.boneNames.length; idx++) {
            if (!this.boneIds.has(model.boneNames[idx])) {
                throw new Error(`ERROR - Tried to serialize model data, could not get bone for ${model.boneNames[idx]}`);
            }

            boneView[idx] = this.boneIds.get(model.boneNames[idx]) || 0;
        }
        uintView[1] = pBoneIds;

        // set boneOffsets
        var pBoneOffsets = this.malloc(model.boneNames.length * MAT4_SIZE);
        var offsetsView = new Float32Array(this.memory.buffer, pBoneOffsets, model.boneNames.length * MAT4_SIZE);
        for (let idx = 0; idx < model.boneNames.length; idx++) {
            offsetsView.set(this.serializeMat4(model.boneOffsets[idx]), idx * 16);
        }
        uintView[2] = pBoneOffsets;

        // set final object
        return pModelData;
    }

    private serializeMat4(mat4: Mat4): Float32Array {
        return mat4.data;
    }

    private serializeQuat(quat: Quaternion): Float32Array {
        return quat.data;
    }

    private registerBones(animation: Animation) {
        animation.staticBones.forEach((_, key) => {
            if (!this.boneIds.has(key)) {
                this.boneIds.set(key, this.nextBoneId++);
            }
        });
    }

    private createAnimationData(animation: Animation): number {
        if (!this.memory) {
            debugger;
            console.error('Cannot create animation data, WASM module not initialized');
            return 0;
        }

        animation.staticBones.forEach((_, key) => {
            if (!this.boneIds.has(key)) {
                console.error(`Could not serialize animation - static bone key ${key} missing from bone registry`);
            }
        });
        animation.animatedBones.forEach((_, key) => {
            if (!this.boneIds.has(key)) {
                console.error(`Could not serialize animation - animated bone key ${key} missing from bone registry`);
            }
        });

        var pAnimationData = this.malloc(FLOAT_SIZE + UINT_SIZE * 4);

        var animationFloatView = new Float32Array(this.memory.buffer, pAnimationData, 1);
        animationFloatView[0] = animation.duration;
        
        var animationUintView = new Uint32Array(this.memory.buffer, pAnimationData + FLOAT_SIZE, 4);
        animationUintView[0] = animation.staticBones.size;
        animationUintView[2] = animation.animatedBones.size;

        // set staticBones
        var pStaticBones = this.malloc(animation.staticBones.size * STATIC_BONE_SIZE);
        var idx = 0;
        animation.staticBones.forEach((bone, name) => {
            if (!this.memory) return; // For TS type safety, grumble grumble...
            if (!this.boneIds.has(name)) { console.error('Bone IDs array does not have bone', name, 'in create static bones'); }
            if (!this.boneIds.has(bone.parent || 'RootNode')) { console.error('Bone IDs array does not have parent node', bone.parent); };

            var uintView = new Uint32Array(this.memory.buffer, pStaticBones + idx * STATIC_BONE_SIZE, UINT_SIZE * 2);
            var floatView = new Float32Array(this.memory.buffer, pStaticBones + idx * STATIC_BONE_SIZE + UINT_SIZE * 2, MAT4_SIZE);
            uintView[0] = this.boneIds.get(name) || 0;
            uintView[1] = this.boneIds.get(bone.parent || 'RootNode') || 0;

            floatView.set(this.serializeMat4(bone.transform));
            idx++;
        });
        animationUintView[1] = pStaticBones;

        // set animatedBones
        var pAnimatedBones = this.malloc(animation.animatedBones.size * ANIMATED_BONE_SIZE);
        idx = 0;
        animation.animatedBones.forEach((bone, name) => {
            if (!this.memory) return; // For TS type safety, grumble grumble...

            var uintView = new Uint32Array(this.memory.buffer, pAnimatedBones + idx * ANIMATED_BONE_SIZE, ANIMATED_BONE_SIZE);
            uintView[0] = this.boneIds.get(name) || 0;
            uintView[1] = bone.positionChannel.length;
            uintView[3] = bone.rotationChannel.length;
            uintView[5] = bone.scalingChannel.length;

            // set positionChannel
            var pPositionChannel = this.malloc(bone.positionChannel.length * POSITION_KEYFRAME_SIZE);
            for (let pidx = 0; pidx < bone.positionChannel.length; pidx++) {
                let view = new Float32Array(this.memory.buffer, pPositionChannel + pidx * POSITION_KEYFRAME_SIZE, POSITION_KEYFRAME_SIZE);
                view[0] = bone.positionChannel[pidx].time;
                view.set(bone.positionChannel[pidx].position.data, 1);
            }

            // set rotationChannel
            var pRotationChannel = this.malloc(bone.rotationChannel.length * ROTATION_KEYFRAME_SIZE);
            for (let ridx = 0; ridx < bone.rotationChannel.length; ridx++) {
                let view = new Float32Array(this.memory.buffer, pRotationChannel + ridx * ROTATION_KEYFRAME_SIZE, ROTATION_KEYFRAME_SIZE);
                view[0] = bone.rotationChannel[ridx].time;
                view.set(this.serializeQuat(bone.rotationChannel[ridx].rotation), 1);
            }

            // set scaleChannel
            var pScaleChannel = this.malloc(bone.scalingChannel.length * SCALING_KEYFRAME_SIZE);
            for (let sidx = 0; sidx < bone.scalingChannel.length; sidx++) {
                let view = new Float32Array(this.memory.buffer, pScaleChannel + sidx * SCALING_KEYFRAME_SIZE, SCALING_KEYFRAME_SIZE);
                view[0] = bone.scalingChannel[sidx].time;
                view.set(bone.scalingChannel[sidx].scale.data, 1);
            }

            uintView[2] = pPositionChannel;
            uintView[4] = pRotationChannel;
            uintView[6] = pScaleChannel;
        });
        animationUintView[3] = pAnimatedBones;

        return pAnimationData;
    }
}
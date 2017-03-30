import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

// TODO SESS: Implement this

/**
 * The Speedy JS Animation Manager builds ArrayBuffer caches for every interesting piece of information for fast retrieval,
 *  cache locality, and avoiding re-computing values.
 * A single ArrayBuffer is used for everything - it is resized much like C++ std::vector, by allocating an excessive amount of space,
 *  doubling that space when it is overfull, copying over old data. This is because we want to optimize this as best I know how, given
 *  the interface. The goal here is to prove that WASM isn't that great.
 * 
 * Registering an animation simply stores the animation. No unpacking is done at this time.
 * Registering a model simply stores the model data. No unpacking is done at this time.
 * Associating a model and an animation pre-generates 60 frames per second worth of pre-computed values for the given model and the
 *  given animation. On failure (bones do not match), the cache space used is freed. A mapping from ((animation, model) -> firstFrameOffset)
 *  is made, so that later retrieval consists of finding the first frame, moving forward by the frame stride to find the desired stride, and
 *  returning a Float32Buffer view to that chunk of memory.
 * Getting animation data is simply grabbing from the buffer at the correct location.
 * 
 * Resting memory use: nextBufferPointer
 */
export class SpeedyJSAnimationManager extends AnimationManager {
    constructor() { super(); }

    public load() {
        return Promise.resolve(true);
    }
    public registerAnimation(animation: Animation): void {
        throw new Error('Method not implemented.');
    }
    public registerModel(model: ModelData): void {
        throw new Error('Method not implemented.');
    }
    public associateModelAndAnimation(animation: Animation, model: ModelData): boolean {
        throw new Error('Method not implemented.');
    }
    public getSingleAnimation(animation: Animation, model: ModelData, animationTime: number): AnimationResult {
        throw new Error('Method not implemented.');
    }
    public getBlendedAnimation(animations: [Animation, Animation], model: ModelData, animationTimes: [number, number], blendFactor: number): AnimationResult {
        throw new Error('Method not implemented.');
    }
    public getRestingMemoryUsage(): number {
        throw new Error('Method not implemented.');
    }
}
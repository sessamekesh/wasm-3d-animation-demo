import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

// TODO SESS: Implement this

/**
 * Follow the same logic as the NaiveJSAnimationManager, but in a WASM module.
 * Notice: Resting memory here will not be zero, because the structs (ModelData, AnimationData) will be
 *  copied to the WASM heap. This is to prevent expensive copies from happening every frame - I want to
 *  simulate a self-contained module here, not just a workhorse for math operations.
 * If I copy memory over every frame, I suspect (haven't actually checked) that the memory cost will swallow
 *  up any benefits of using WASM.
 */
export class NaiveWASMAnimationManager extends AnimationManager {
    constructor() { super(); }

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
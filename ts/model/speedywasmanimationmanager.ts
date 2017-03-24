import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

// TODO SESS: Implement this

/**
 * Follow the same logic as the SpeedyJSAnimationManager, but in a WASM module.
 * Should be remarkably similar, except the ArrayBuffer being used _happens_ to be the WASM heap buffer
 */
export class SpeedyWASMAnimationManager extends AnimationManager {
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
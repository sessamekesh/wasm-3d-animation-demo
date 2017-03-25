import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

// TODO SESS: Implement this

/**
 * Follows the same logit as the NaiveWASMAnimationManager, except that the data registered isn't stored in
 *  WASM structures - it is re-marshalled every time it is requested.
 * This is to test the idea that the operation of marshalling takes longer than it is worth
 */
export class SuperNaiveWASMAnimationManager extends AnimationManager {
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